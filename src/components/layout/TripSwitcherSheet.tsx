'use client'

// TripSwitcherSheet — bottom sheet listing user's trips for switching.
// Renders one row per trip (Link) + a wired "+ Crear nuevo viaje" entry (D-05, Phase 2).
// If no trips: shows EmptyState with es.tripSwitcher.emptyHeading + emptyBody.

import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { EmptyState } from '@/components/common/EmptyState'
import { es } from '@/i18n/es'
import { ChevronDown } from 'lucide-react'

interface Trip {
  id: string
  name: string
}

interface TripSwitcherSheetProps {
  tripId: string
  tripName: string
  trips: Trip[]
}

export function TripSwitcherSheet({ tripId, tripName, trips }: TripSwitcherSheetProps) {
  return (
    <Sheet>
      <SheetTrigger className="flex items-center gap-1 text-base font-bold text-fg truncate max-w-[160px]">
        <span className="truncate">{tripName}</span>
        <ChevronDown className="w-4 h-4 text-fg-muted flex-shrink-0" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader>
          <SheetTitle>{tripName}</SheetTitle>
        </SheetHeader>

        {trips.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState
              heading={es.tripSwitcher.emptyHeading}
              body={es.tripSwitcher.emptyBody}
            />
          </div>
        ) : (
          <div className="flex flex-col px-4 pb-2">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/t/${trip.id}/docs`}
                className="py-3 text-base text-fg border-b border-border last:border-b-0 hover:text-primary transition-colors"
              >
                {trip.name}
              </Link>
            ))}
          </div>
        )}

        {/* D-05: Wired create entry — navigates to the create trip screen (/trips/nueva) */}
        <div className="px-4 pb-4 pt-2 border-t border-border">
          <Link
            href="/trips/nueva"
            className="block w-full py-3 text-base text-fg text-left hover:text-primary transition-colors"
            aria-label={es.tripSwitcher.createCta}
          >
            {es.tripSwitcher.createCta}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
