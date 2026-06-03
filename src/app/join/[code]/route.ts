// src/app/join/[code]/route.ts — Typed invite-code join handler (Plan 09)
// Next.js Route Handler (GET), NOT a page component.
// Why a route handler: joinTripByCode() calls signInAnonymously(), which must WRITE the session
// cookie. Cookies can only be set in a Route Handler or Server Action — never during a Server
// Component render. This mirrors the pattern from the retired /join/[token] route.
// Flow: length-guard → joinTripByCode (anon sign-in + membership) → redirect into the trip.
// The DB resolver (get_trip_id_by_invite_code) is the source of truth on existence:
// an unknown but length-valid code resolves to NULL → invalidJoinToken.

import { NextResponse } from 'next/server'
import { joinTripByCode } from '@/actions/members'
import { es } from '@/i18n/es'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { origin } = new URL(request.url)
  const { code } = await params
  const decoded = decodeURIComponent(code).trim()

  // Lightweight guard: reject obviously malformed or oversized inputs before hitting the DB.
  // The DB resolver handles unknown well-formed codes (returns NULL → invalidJoinToken).
  if (!decoded || decoded.length > 32) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(es.errors.invalidJoinToken)}`
    )
  }

  // Sign in anonymously (sets the session cookie — allowed here) + join the trip
  const result = await joinTripByCode(decoded)

  if (result.error || !result.tripId) {
    const errorMsg = result.error ?? es.errors.genericNetwork
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorMsg)}`)
  }

  // Success — redirect to the trip's docs tab
  return NextResponse.redirect(`${origin}/t/${result.tripId}/docs`)
}
