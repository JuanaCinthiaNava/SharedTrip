'use client'

// DeleteTripDialog — type-the-exact-name confirmation before hard delete (D-16, D-17, TRIP-09).
// Uses AlertDialog (base-ui) with a controlled Input gate.
// Confirm button stays disabled until typed value === trip.name (trim-exact, case-sensitive).
// On confirm → deleteTrip(tripId) → router.push('/') (creator leaves the deleted trip).
// Creator-only: rendered only when currentUserId === creatorId (enforced by parent page).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { es } from '@/i18n/es'
import { deleteTrip } from '@/actions/trips'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface DeleteTripDialogProps {
  tripId: string
  /** Exact trip name — user must type this to enable the confirm button (D-17). */
  name: string
}

export function DeleteTripDialog({ tripId, name }: DeleteTripDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmValue, setConfirmValue] = useState('')

  // D-17: disabled until typed value === trip.name (trim-exact, case-sensitive)
  const isConfirmed = confirmValue === name

  function handleConfirm() {
    if (!isConfirmed) return
    startTransition(async () => {
      const { error } = await deleteTrip(tripId)
      if (error) {
        toast.error(error)
      } else {
        router.push('/')
      }
    })
  }

  return (
    <AlertDialog>
      {/* Destructive trigger — de-emphasized, lowest affordance on the page */}
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        {es.trip.deleteCta}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {es.trip.deleteDialogHeading}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {es.trip.deleteDialogBody}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Type-to-confirm gate (D-17) */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="delete-confirm-input"
            className="text-sm font-bold text-fg"
          >
            {es.trip.deleteConfirmLabel(name)}
          </label>
          <Input
            id="delete-confirm-input"
            type="text"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={name}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setConfirmValue('')}
          >
            {es.members.cancel}
          </AlertDialogCancel>

          {/* Destructive confirm — disabled until exact name typed */}
          <AlertDialogAction
            variant="destructive"
            disabled={!isConfirmed || isPending}
            onClick={handleConfirm}
          >
            {es.trip.deleteCta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
