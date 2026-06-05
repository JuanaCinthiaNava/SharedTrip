'use server'

// src/actions/members.ts — Trip membership server actions
// joinTripByCode: signs in anonymously (if no session), resolves the invite code to a trip id,
// inserts a trip_members row, and returns the trip id for the caller to redirect.
// All error strings via es.errors.* — zero hardcoded Spanish text.
//
// Plan 09: joinTrip (uuid token) replaced by joinTripByCode (text invite code).
// The service-role upsert pattern (anon-join-architecture) is unchanged — only step 2 changes.
//
// Plan 02-04: removeMember + leaveTrip added. These run under NORMAL RLS — no service-role.
// The trip_members DELETE policy authorizes admin-remove + self-leave; no bypass needed.

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import type { Database } from '@/types/database'

/**
 * joinTripByCode — join a trip via a typed invite code (e.g. 'TEST-AB12').
 *
 * Logic:
 * 1. Get current session. If no user, call signInAnonymously() (sets the session cookie).
 * 2. Resolve the trip id from the invite_code via the get_trip_id_by_invite_code RPC
 *    (SECURITY DEFINER — a not-yet-member cannot pass the membership-gated trips SELECT policy).
 *    The RPC normalizes the code via upper(trim()); we pass the raw input as the RPC handles it.
 * 3. Insert the trip_members row with the service-role client, then return { tripId, error }.
 *
 * Why the membership insert uses the service-role client:
 * The trip_members INSERT policy is `WITH CHECK (user_id = auth.uid())`. Immediately after
 * signInAnonymously() the new session lives only on the RESPONSE cookie — the @supabase/ssr
 * client (and a fresh access-token client) does not carry it on the very next request in the
 * same invocation, so the insert runs unauthenticated (auth.uid() = null) and the WITH CHECK
 * fails. Rather than fight the in-request session propagation, we perform this one bounded
 * mutation with the service-role key. It is SAFE: `userId` is taken from the server-side
 * session (getUser / signInAnonymously), never from client input, and the trip id is resolved
 * from a valid invite code — so the only thing inserted is "add THIS authenticated user to a
 * trip they hold a valid code for," exactly the invite capability. The service key is
 * server-only (never NEXT_PUBLIC). Code resolution still uses the minimal-privilege RPC.
 *
 * Does NOT redirect — the calling route handler handles navigation.
 */
export async function joinTripByCode(
  code: string
): Promise<{ tripId: string | null; error: string | null }> {
  const supabase = await createClient()

  // Step 1: Ensure we have a user session
  const { data: { user: existingUser } } = await supabase.auth.getUser()

  // Do NOT short-circuit on a getUser() error. After signOut the session is missing or invalid
  // and getUser() returns an auth error (e.g. AuthSessionMissingError, status 400) — that is
  // precisely the case where we SHOULD mint a fresh anonymous session, not bail. (An earlier
  // guard that returned genericNetwork on any non-zero-status error broke re-join after sign-out.)
  // A genuine network/transport outage still surfaces below: signInAnonymously() will fail and
  // return es.errors.genericNetwork.
  let userId = existingUser?.id

  if (!existingUser) {
    // No session — sign in anonymously (writes the session cookie on the response)
    const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()

    if (anonErr || !anonData.user) {
      return { tripId: null, error: es.errors.genericNetwork }
    }

    userId = anonData.user.id
  }

  if (!userId) {
    return { tripId: null, error: es.errors.genericNetwork }
  }

  // Step 2: Resolve the trip id from the invite_code via the SECURITY DEFINER RPC.
  // The RPC normalizes via upper(trim(lookup_code)), so we pass the raw code as-is.
  // Works for a not-yet-member (the controlled bypass returns only the trip id).
  const { data: resolvedTripId, error: tripErr } = await supabase.rpc('get_trip_id_by_invite_code', {
    lookup_code: code,
  })

  if (tripErr || !resolvedTripId) {
    return { tripId: null, error: es.errors.invalidJoinToken }
  }

  // Step 3: Insert the trip_members row with the service-role client (bypasses the
  // `user_id = auth.uid()` WITH CHECK that the just-signed-in session can't yet satisfy).
  // Idempotent via onConflict on the composite PK. A real error here means the join did NOT
  // take effect — fatal, since returning success would bounce the user back out of the trip.
  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { error: upsertErr } = await admin
    .from('trip_members')
    .upsert(
      { trip_id: resolvedTripId, user_id: userId, role: 'member' },
      { onConflict: 'trip_id,user_id', ignoreDuplicates: true }
    )

  if (upsertErr) {
    console.error('[joinTripByCode] membership insert failed:', upsertErr.message)
    return { tripId: null, error: es.errors.genericNetwork }
  }

  return { tripId: resolvedTripId, error: null }
}

/**
 * leaveTrip — the authenticated user leaves a trip they are a member of (TRIP-07).
 *
 * Runs under NORMAL RLS (plain SSR client — no service-role bypass).
 * The trip_members DELETE policy authorizes self-leave: `user_id = (SELECT auth.uid())`.
 * Actor identity comes from server-side getUser(); tripId is the row scope key.
 *
 * On success: revalidates the gente page so the RSC tree refreshes.
 * Caller (MemberRow) also runs router.push('/') to bounce the leaver (D-13).
 */
export async function leaveTrip(tripId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: es.errors.sessionExpired }
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', user.id) // self-leave; RLS enforces this anyway

  if (error) {
    return { error: es.errors.genericNetwork }
  }

  revalidatePath('/t/[tripId]/gente', 'page')
  return { error: null }
}

/**
 * removeMember — the trip creator removes another member (TRIP-06).
 *
 * Runs under NORMAL RLS (plain SSR client — no service-role bypass).
 * The trip_members DELETE policy authorizes admin-remove:
 *   `trip_id IN (SELECT id FROM trips WHERE created_by = auth.uid())`.
 * Actor identity comes from server-side getUser(); targetUserId is only a row key —
 * it never grants the caller the target's authority (T-02-12).
 *
 * On success: revalidates the gente page so the RSC tree refreshes.
 * Caller (MemberRow) also runs router.refresh() (D-11).
 */
export async function removeMember(
  tripId: string,
  targetUserId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: es.errors.sessionExpired }
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', targetUserId) // admin-remove: RLS allows only creator to delete others

  if (error) {
    return { error: es.errors.genericNetwork }
  }

  revalidatePath('/t/[tripId]/gente', 'page')
  return { error: null }
}
