// src/app/join/[token]/route.ts — Anonymous invite join handler
// Next.js Route Handler (GET), NOT a page component.
// Why a route handler: joinTrip() calls signInAnonymously(), which must WRITE the session
// cookie. Cookies can only be set in a Route Handler or Server Action — never during a Server
// Component render. As a page this threw at runtime (cookieStore.set during render), so the
// anonymous-join entry path was broken. This mirrors /auth/callback/route.ts.
// Flow: validate token format → joinTrip (anon sign-in + membership) → redirect into the trip.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { joinTrip } from '@/actions/members'
import { es } from '@/i18n/es'

// UUID-format validation — matches what the Postgres `uuid` column accepts (8-4-4-4-12 hex),
// NOT a strict RFC version/variant check. Zod v4's .uuid() rejects valid `uuid`-column values
// whose version/variant nibbles aren't RFC4122 (e.g. the all-2s seed invite_token), which would
// reject a legitimate token before joinTrip ever runs. The DB is the source of truth on existence:
// an unknown but well-formed token simply resolves to no trip and surfaces invalidJoinToken.
const uuidSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { origin } = new URL(request.url)
  const { token } = await params

  // Validate token format before hitting the DB — prevents obviously-malformed tokens
  const parsed = uuidSchema.safeParse(token)
  if (!parsed.success) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(es.errors.invalidJoinToken)}`
    )
  }

  // Sign in anonymously (sets the session cookie — allowed here) + join the trip
  const result = await joinTrip(parsed.data)

  if (result.error || !result.tripId) {
    const errorMsg = result.error ?? es.errors.genericNetwork
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorMsg)}`)
  }

  // Success — redirect to the trip's docs tab
  return NextResponse.redirect(`${origin}/t/${result.tripId}/docs`)
}
