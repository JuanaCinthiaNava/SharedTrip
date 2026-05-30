// src/app/join/[token]/page.tsx — Anonymous invite join handler
// Server Component: validates the token, calls joinTrip, and redirects.
// No JSX is rendered — this page always redirects.
// Token validation: Zod UUID check before calling the server action.
// Error path: redirects to /?error=... so the welcome page shows a toast.

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { joinTrip } from '@/actions/members'
import { es } from '@/i18n/es'

interface JoinPageProps {
  params: Promise<{ token: string }>
}

// UUID v4 format validation
const uuidSchema = z.string().uuid()

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params

  // Validate token format before hitting the DB — prevents obviously-malformed tokens
  const parsed = uuidSchema.safeParse(token)
  if (!parsed.success) {
    redirect(`/?error=${encodeURIComponent(es.errors.invalidJoinToken)}`)
  }

  // Call the server action to sign in anonymously + join the trip
  const result = await joinTrip(parsed.data)

  if (result.error || !result.tripId) {
    const errorMsg = result.error ?? es.errors.genericNetwork
    redirect(`/?error=${encodeURIComponent(errorMsg)}`)
  }

  // Success — redirect to the trip's docs tab
  redirect(`/t/${result.tripId}/docs`)
}
