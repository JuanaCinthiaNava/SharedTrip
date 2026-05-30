'use client'

// TopHeader — 56px sticky header for the trip shell.
// Left: TripSwitcherSheet trigger (trip name + chevron).
// Right: "Sin cuenta" pill (when anonymous) + Avatar link to /t/{tripId}/perfil.
// Plan 05: SinCuentaPill shown when isAnonymous=true; tapping it opens AnonymousUpgradeSheet.
// AnonymousUpgradeSheet open state is owned by Zustand useBannerStore (decoupled from AnonymousBanner).

import Link from 'next/link'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { TripSwitcherSheet } from '@/components/layout/TripSwitcherSheet'
import { SinCuentaPill } from '@/components/common/SinCuentaPill'
import { AnonymousUpgradeSheet } from '@/components/auth/AnonymousUpgradeSheet'
import { useBannerStore } from '@/stores/banner'

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
  const { upgradeSheetOpen, openUpgradeSheet, closeUpgradeSheet } = useBannerStore()

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-surface border-b border-border flex items-center justify-between px-4">
        {/* Left: trip name dropdown trigger */}
        <TripSwitcherSheet tripId={tripId} tripName={tripName} trips={trips} />

        {/* Right: "Sin cuenta" pill (if anonymous) + avatar → perfil route */}
        <div className="flex items-center gap-2">
          {/* Plan 05: "Sin cuenta" pill (mango bg, navy text) — left of avatar per UI-SPEC */}
          {isAnonymous && <SinCuentaPill />}

          <Link href={`/t/${tripId}/perfil`} className="flex items-center" aria-label="Perfil">
            <UserAvatar userId={userId} avatarSeed={avatarSeed} displayName={displayName} size="md" />
          </Link>
        </div>
      </header>

      {/* AnonymousUpgradeSheet — also triggered by pill click (via Zustand store) */}
      {isAnonymous && (
        <AnonymousUpgradeSheet
          open={upgradeSheetOpen}
          onOpenChange={(nextOpen) => (nextOpen ? openUpgradeSheet() : closeUpgradeSheet())}
        />
      )}
    </>
  )
}
