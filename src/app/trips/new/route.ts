// src/app/trips/new/route.ts — Trip creation route handler (Plan 02-02)
// Next.js Route Handler (POST), NOT a page component.
//
// Why a route handler: createTrip() calls signInAnonymously(), which must WRITE the session
// cookie. Cookies can only be set in a Route Handler or Server Action — never during RSC render.
// This mirrors the pattern from /join/[code]/route.ts.
//
// Flow: validate body → createTrip (anon sign-in + service-role inserts) → redirect into trip.
// On success: redirects to /t/[tripId]/gente so the creator immediately sees the invite card.
// On error: redirects back to / with ?error= param (handled by ErrorToast component).

import { NextResponse } from 'next/server'
import { createTrip } from '@/actions/trips'
import { es } from '@/i18n/es'

export async function POST(request: Request): Promise<Response> {
  const { origin } = new URL(request.url)

  let body: { name?: unknown; startDate?: unknown; endDate?: unknown; description?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(es.errors.genericNetwork)}`
    )
  }

  // Server-side validation: name is required and must be a non-empty string (T-02-06)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 80) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(es.trip.invalidName)}`
    )
  }

  const startDate = typeof body.startDate === 'string' ? body.startDate : null
  const endDate = typeof body.endDate === 'string' ? body.endDate : null
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null

  const result = await createTrip({ name, startDate, endDate, description })

  if (result.error || !result.tripId) {
    const errorMsg = result.error ?? es.errors.genericNetwork
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorMsg)}`)
  }

  // Success — redirect to the trip's gente tab so the creator sees the invite card immediately
  return NextResponse.redirect(`${origin}/t/${result.tripId}/gente`)
}
