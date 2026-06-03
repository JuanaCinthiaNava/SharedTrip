'use client'

// TopHeader — 56px sticky header for the trip shell.
// Left: TripSwitcherSheet trigger (trip name + chevron).
// Right: "Sin cuenta" pill (when anonymous, D-11 retained) + Avatar link to /t/{tripId}/perfil.
// Plan 09: email-upgrade sheet and banner store removed — email-upgrade flow deferred to
// Phase 6 (D-12). The SinCuentaPill is a static indicator in v1; tapping it does nothing.

import Link from 'next/link'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { TripSwitcherSheet } from '@/components/layout/TripSwitcherSheet'
import { SinCuentaPill } from '@/components/common/SinCuentaPill'

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
  isAnonymous = false,
  trips,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-surface border-b border-border flex items-center justify-between px-4">
      {/* Left: trip name dropdown trigger */}
      <TripSwitcherSheet tripId={tripId} tripName={tripName} trips={trips} />

      {/* Right: "Sin cuenta" pill (if anonymous, D-11) + avatar → perfil route */}
      {/* Note: pill is a static indicator in v1; Phase 6 will re-wire it to the email-upgrade sheet */}
      <div className="flex items-center gap-2">
        {isAnonymous && <SinCuentaPill />}

        <Link href={`/t/${tripId}/perfil`} className="flex items-center" aria-label="Perfil">
          <UserAvatar userId={userId} avatarSeed={avatarSeed} displayName={displayName} size="md" />
        </Link>
      </div>
    </header>
  )
}
