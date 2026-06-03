'use server'

// src/actions/auth.ts — Auth Server Actions
// All auth mutations run server-side only. Never expose Supabase mutations to the browser.
// Uses the server factory (createClient from lib/supabase/server) which uses the publishable key.
//
// Plan 09: magic-link action removed — email entry is deferred to Phase 6 (no verified domain).
// signOut is retained; the profile tab's Cerrar sesión dialog still depends on it.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * signOut — signs the user out server-side and redirects to the welcome page.
 * Called from Plan 05's AlertDialog confirmation. Uses redirect() from next/navigation.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
