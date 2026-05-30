'use server'

// src/actions/profile.ts — Profile Server Actions
// updateProfile: updates the user's display_name in the profiles table.
// Defense-in-depth: uses .eq('id', user.id) even though RLS already restricts UPDATE to own row.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'

const displayNameSchema = z
  .string()
  .min(1, es.profile.invalidName)
  .max(60, es.profile.invalidName)

/**
 * updateProfile — updates display_name for the authenticated user.
 * Validates input via Zod (1–60 chars). Returns { error: string | null }.
 * On success, revalidates the trip layout so TopHeader re-renders with the new name.
 */
export async function updateProfile(input: {
  displayName: string
}): Promise<{ error: string | null }> {
  const parsed = displayNameSchema.safeParse(input.displayName)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? es.profile.invalidName }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: es.errors.sessionExpired }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data })
    .eq('id', user.id)

  if (error) {
    return { error: es.errors.genericNetwork }
  }

  // Revalidate the trip layout so TopHeader re-renders with the new name.
  // Use the dynamic path pattern so all trip layouts are refreshed.
  revalidatePath('/t/[tripId]', 'layout')

  return { error: null }
}
