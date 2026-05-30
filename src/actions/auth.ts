'use server'

// src/actions/auth.ts — Auth Server Actions
// All auth mutations run server-side only. Never expose Supabase mutations to the browser.
// Uses the server factory (createClient from lib/supabase/server) which uses the publishable key.
// ANTI-PATTERN: do NOT use supabase.auth.admin.generateLink() — simple approach per Pitfall 5.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * sendMagicLink — requests a Supabase OTP magic link for the given email.
 * Supabase will send the email using the configured Resend SMTP + the template
 * configured in Supabase Dashboard → Authentication → Email Templates → Magic Link.
 *
 * The subject template `Acceso a tu viaje · {{ .Token }}` is set in the dashboard,
 * not here — see plan user_setup for the dashboard config steps.
 *
 * Returns { error: string | null } — does NOT throw, so the client form can display the error.
 */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  return { error: error?.message ?? null }
}

/**
 * signOut — signs the user out server-side and redirects to the welcome page.
 * Called from Plan 05's AlertDialog confirmation. Uses redirect() from next/navigation.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
