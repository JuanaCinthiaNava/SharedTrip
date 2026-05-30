// src/app/auth/callback/route.ts — PKCE auth callback handler
// Exchanges the Supabase PKCE code for a session cookie.
// This is a Next.js Route Handler (GET method), not a page component.
// PKCE code is single-use and bound to the code_verifier in the requester's cookie.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // T-03-06 open-redirect mitigation (HIGH-4):
  // Validate that the `next` param is a relative path (starts with `/` but NOT `//`).
  // `//evil.com` is a protocol-relative URL that browsers treat as an absolute URL.
  // Guard: normalize to `/` if the `next` value would redirect off-site.
  let next = searchParams.get('next') ?? '/'
  if (next.startsWith('//') || !next.startsWith('/')) {
    // T-03-06: block open redirect — e.g. ?next=//evil.com → normalize to /
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Session established — redirect to `next` (relative path, validated above)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failure (missing code, invalid code, expired code, or PKCE mismatch):
  // Redirect to check-email page with error query param so the user sees a Spanish error.
  return NextResponse.redirect(`${origin}/auth/check-email?error=invalid_link`)
}
