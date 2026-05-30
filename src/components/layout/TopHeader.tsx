'use client'

// TopHeader — 56px sticky header for the trip shell.
// Left: TripSwitcherSheet trigger (trip name + chevron).
// Right: Avatar link to /t/{tripId}/perfil.
// isAnonymous prop accepted — Plan 05 will add the "Sin cuenta" pill when true.

import Link from 'next/link'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { TripSwitcherSheet } from '@/components/layout/TripSwitcherSheet'

interface Trip {
  id: string
  name: string
}

interface TopHeaderProps {
  tripId: string
  tripName: string
  userId: string
  avatarSeed: string | null
  displayName: string | null
  isAnonymous?: boolean
  trips: Trip[]
}

export function TopHeader({
  tripId,
  tripName,
  userId,
  avatarSeed,
  displayName,
  // isAnonymous — placeholder for Plan 05's "Sin cuenta" pill
  trips,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-surface border-b border-border flex items-center justify-between px-4">
      {/* Left: trip name dropdown trigger */}
      <TripSwitcherSheet tripId={tripId} tripName={tripName} trips={trips} />

      {/* Right: avatar → perfil route */}
      {/* Plan 05 slot: "Sin cuenta" pill goes between here and the avatar */}
      <Link href={`/t/${tripId}/perfil`} className="flex items-center" aria-label="Perfil">
        <UserAvatar userId={userId} avatarSeed={avatarSeed} displayName={displayName} size="md" />
      </Link>
    </header>
  )
}
