'use server'

// src/actions/members.ts — Trip membership server actions
// joinTrip: signs in anonymously (if no session), validates the invite token,
// upserts a trip_members row, and returns the trip id for the caller to redirect.
// All error strings via es.errors.* — zero hardcoded Spanish text.

import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'

/**
 * joinTrip — join a trip via invite token.
 *
 * Logic:
 * 1. Get current session. If no user, call signInAnonymously().
 * 2. Look up the trip by invite_token.
 * 3. Upsert a trip_members row (idempotent — re-joining is safe).
 * 4. Return { tripId, error }.
 *
 * Does NOT redirect — the calling page handles navigation.
 */
export async function joinTrip(
  token: string
): Promise<{ tripId: string | null; error: string | null }> {
  const supabase = await createClient()

  // Step 1: Ensure we have a user session
  const { data: { user: existingUser } } = await supabase.auth.getUser()

  let userId = existingUser?.id

  if (!existingUser) {
    // No session — sign in anonymously
    const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()

    if (anonErr || !anonData.user) {
      return { tripId: null, error: es.errors.genericNetwork }
    }

    userId = anonData.user.id
  }

  if (!userId) {
    return { tripId: null, error: es.errors.genericNetwork }
  }

  // Step 2: Look up the trip by invite_token
  // PGRST116 is returned by .single() when 0 rows match
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (tripErr || !trip) {
    return { tripId: null, error: es.errors.invalidJoinToken }
  }

  // Step 3: Upsert the trip_members row (idempotent)
  // onConflict on the composite PK (trip_id, user_id) — duplicate join is harmless
  const { error: upsertErr } = await supabase
    .from('trip_members')
    .upsert(
      { trip_id: trip.id, user_id: userId, role: 'member' },
      { onConflict: 'trip_id,user_id' }
    )

  if (upsertErr) {
    // Log the error but don't fail — the user may already be a member
    console.error('[joinTrip] upsert error (may be harmless):', upsertErr.message)
  }

  return { tripId: trip.id, error: null }
}
