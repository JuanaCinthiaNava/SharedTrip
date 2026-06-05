'use client'

// EditTripSheet — reuses CreateTripForm pre-filled for edit mode (D-14, TRIP-08).
// Opens as a bottom-sheet (side="bottom") triggered by es.trip.editCta.
// Passes an onSubmit override that calls updateTrip(tripId, input) + router.refresh().
// Only rendered when currentUserId === creatorId (creator-only affordance).

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { es } from '@/i18n/es'
import { updateTrip } from '@/actions/trips'
import { CreateTripForm } from './CreateTripForm'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface EditTripSheetProps {
  tripId: string
  /** Current trip values — pre-fills the form. */
  name: string
  startDate: string | null
  endDate: string | null
  description: string | null
}

export function EditTripSheet({
  tripId,
  name,
  startDate,
  endDate,
  description,
}: EditTripSheetProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  async function handleSubmit(values: {
    name: string
    startDate: string | null
    endDate: string | null
    description: string | null
  }) {
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        const { error } = await updateTrip(tripId, values)
        if (error) {
          toast.error(error)
        } else {
          toast.success(es.trip.saveCta)
          setOpen(false)
          router.refresh()
        }
        resolve()
      })
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="text-accent border-accent/30 hover:bg-accent/10" />
        }
      >
        {es.trip.editCta}
      </SheetTrigger>

      <SheetContent side="bottom" className="px-4 pb-8 pt-4 max-h-[90dvh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="px-0">
          <SheetTitle className="text-xl font-bold leading-[1.3] text-fg">
            {es.trip.editCta}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <CreateTripForm
            defaultValues={{ name, startDate, endDate, description }}
            onSubmit={handleSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
