'use server'

// src/actions/trips.ts — Trip CRUD server actions
//
// createTrip: signs in anonymously (if no session), inserts the trip with a generated
// invite_code (retry on UNIQUE violation), inserts the creator as a trip_members admin row,
// and returns { tripId, error }.
//
// Uses the service-role bounded-mutation pattern from joinTripByCode in members.ts:
// - Identity ALWAYS from getUser()/signInAnonymously() — NEVER from request body
// - Service-role client (process.env.SUPABASE_SECRET_KEY) for both inserts (RLS chicken-and-egg)
// - Retry loop against trips_invite_code_key UNIQUE (Postgres code 23505)
// - Do NOT short-circuit on getUser() error (see members.ts:48-53 — breaks re-join)
//
// updateTrip / deleteTrip run under normal RLS (creator-only policies already authorize).

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils/invite-code'
import { es } from '@/i18n/es'
import type { Database } from '@/types/database'
import { revalidatePath } from 'next/cache'

interface CreateTripInput {
  name: string
  startDate: string | null  // 'YYYY-MM-DD' (local), null if no dates — NEVER .toISOString()
  endDate: string | null
  description: string | null
}

/**
 * createTrip — create a new trip with a generated invite_code and insert the creator
 * as a trip_members admin row. Uses the service-role bounded-mutation pattern.
 *
 * Security:
 * - created_by / user_id taken ONLY from server session, never from input
 * - service-role key (SUPABASE_SECRET_KEY) is server-only, never NEXT_PUBLIC_*
 * - only these two bounded inserts use service-role; edit/delete run under RLS
 */
export async function createTrip(
  input: CreateTripInput
): Promise<{ tripId: string | null; error: string | null }> {
  const supabase = await createClient()

  // Step 1: Ensure we have a user session — identity from server session only
  // Do NOT short-circuit on a getUser() error. After signOut the session is missing or invalid
  // and getUser() returns an auth error — that is precisely the case where we SHOULD mint a
  // fresh anonymous session, not bail. (An earlier guard that returned genericNetwork on any
  // non-zero-status error broke re-join after sign-out — members.ts:48-53.)
  const { data: { user: existingUser } } = await supabase.auth.getUser()
  let userId = existingUser?.id

  if (!existingUser) {
    const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()
    if (anonErr || !anonData.user) {
      return { tripId: null, error: es.errors.genericNetwork }
    }
    userId = anonData.user.id
  }

  if (!userId) {
    return { tripId: null, error: es.errors.genericNetwork }
  }

  // Step 2: Service-role client for the bounded create inserts.
  // Identical constraint as joinTripByCode: the freshly-minted anon session lives only on
  // the response cookie; RLS WITH CHECK (created_by = auth.uid()) sees null on this request.
  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,  // server-only env var (see members.ts for precedent)
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // Step 3: Insert trip with invite_code collision-retry loop (Pitfall 3).
  // On Postgres unique_violation (code 23505) regenerate and retry up to 5 times.
  // On any OTHER error return genericNetwork immediately (do not mask real failures).
  let tripId: string | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite_code = generateInviteCode(input.name)
    const { data, error } = await admin
      .from('trips')
      .insert({
        name: input.name,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
        created_by: userId,
        invite_code,
      })
      .select('id')
      .single()

    if (!error && data) {
      tripId = data.id
      break
    }

    // 23505 = unique_violation → regenerate invite_code and retry
    if (error && (error as { code?: string }).code !== '23505') {
      return { tripId: null, error: es.errors.genericNetwork }
    }
  }

  // After 5 attempts with no success, fail closed (Pitfall 3)
  if (!tripId) {
    return { tripId: null, error: es.errors.genericNetwork }
  }

  // Step 4: Insert the creator as a trip_members admin row (same service-role rationale).
  // Idempotent via onConflict — safe to call twice without creating a duplicate row.
  const { error: memberErr } = await admin
    .from('trip_members')
    .upsert(
      { trip_id: tripId, user_id: userId, role: 'admin' },
      { onConflict: 'trip_id,user_id', ignoreDuplicates: true }
    )

  if (memberErr) {
    console.error('[createTrip] membership insert failed:', memberErr.message)
    return { tripId: null, error: es.errors.genericNetwork }
  }

  return { tripId, error: null }
}

interface UpdateTripInput {
  tripId: string
  name: string
  startDate: string | null
  endDate: string | null
  description: string | null
}

/**
 * updateTrip — update trip fields under normal RLS (creator-only UPDATE policy).
 * No service-role needed — the creator's session is present for edit operations.
 */
export async function updateTrip(
  input: UpdateTripInput
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: es.errors.sessionExpired }

  const { error } = await supabase
    .from('trips')
    .update({
      name: input.name,
      description: input.description,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .eq('id', input.tripId)

  if (error) {
    console.error('[updateTrip] update failed:', error.message)
    return { error: es.errors.genericNetwork }
  }

  revalidatePath(`/t/${input.tripId}`)
  return { error: null }
}

/**
 * deleteTrip — delete trip (cascades to all children) under normal RLS.
 * Creator-only DELETE RLS policy enforces authorization.
 */
export async function deleteTrip(
  tripId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: es.errors.sessionExpired }

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)

  if (error) {
    console.error('[deleteTrip] delete failed:', error.message)
    return { error: es.errors.genericNetwork }
  }

  revalidatePath('/')
  return { error: null }
}
