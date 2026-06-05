'use client'

// MemberRow — single member row: avatar + display name + role badge(s) + inline action.
// Badges (D-10): 'Creador' (coral-tinted) when user is trip creator; 'Tú' (neutral) when
// user is the current user. Both badges shown if both conditions apply (Creador first).
//
// Inline actions (D-11, D-12, D-15 — 02-04):
//   - Creator viewing another member's row → "Quitar" → AlertDialog → removeMember()
//   - Non-creator member viewing their own row → "Salir del viaje" → AlertDialog → leaveTrip()
//   - Creator's own row → no action (D-15: exit = delete in 02-05)
// Both actions use text-destructive (NOT coral/teal) per UI-SPEC.
// After success: Quitar → router.refresh(); Salir → router.push('/') (D-13 bounce).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/profile/UserAvatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { removeMember, leaveTrip } from '@/actions/members'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

interface MemberRowProps {
  userId: string
  displayName: string | null | undefined
  avatarSeed: string | null | undefined
  isCreator: boolean
  isCurrentUser: boolean
  /** Right-aligned action slot — kept for backwards-compat; prefer creatorId+tripId+tripName. */
  actionSlot?: React.ReactNode
  /** Required to render inline remove/leave actions (02-04). */
  creatorId?: string
  currentUserId?: string
  tripId?: string
  tripName?: string
}

export function MemberRow({
  userId,
  displayName,
  avatarSeed,
  isCreator,
  isCurrentUser,
  actionSlot,
  creatorId,
  currentUserId,
  tripId,
  tripName,
}: MemberRowProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  // Viewer is the creator: currentUserId === creatorId (D-12)
  const viewerIsCreator = !!(currentUserId && creatorId && currentUserId === creatorId)
  // This row belongs to the viewing user
  const isOwnRow = isCurrentUser

  // Inline action logic (D-12/D-15):
  //   - showRemove: viewer is creator AND this is NOT the creator's own row
  //   - showLeave: this is the viewer's own row AND viewer is NOT the creator
  const showRemove = viewerIsCreator && !isOwnRow && !!tripId
  const showLeave = isOwnRow && !viewerIsCreator && !!tripId

  const displayedName = displayName ?? ''

  async function handleRemove() {
    if (!tripId) return
    setPending(true)
    const { error } = await removeMember(tripId, userId)
    setPending(false)
    if (error) {
      toast.error(error)
    } else {
      router.refresh()
    }
  }

  async function handleLeave() {
    if (!tripId) return
    setPending(true)
    const { error } = await leaveTrip(tripId)
    setPending(false)
    if (error) {
      toast.error(error)
    } else {
      router.push('/')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 min-h-11 py-3',
        'border-b border-border last:border-b-0',
      )}
    >
      {/* Avatar */}
      <UserAvatar
        userId={userId}
        avatarSeed={avatarSeed}
        displayName={displayName}
        size="md"
      />

      {/* Display name — 16px/400 text-fg */}
      <span className="flex-1 text-base font-normal text-fg truncate">
        {displayedName}
      </span>

      {/* Role badges */}
      <div className="flex items-center gap-2 shrink-0">
        {isCreator && (
          <span className="bg-primary/15 text-primary text-sm font-bold rounded-md px-2 py-1">
            {es.members.badgeCreator}
          </span>
        )}
        {isCurrentUser && (
          <span className="bg-surface text-fg-muted border border-border text-sm font-bold rounded-md px-2 py-1">
            {es.members.badgeYou}
          </span>
        )}
      </div>

      {/* Inline actions — AlertDialog confirms (D-11/D-12/D-15) */}
      {showRemove && (
        <div className="shrink-0 min-h-11 flex items-center">
          <AlertDialog>
            <AlertDialogTrigger
              disabled={pending}
              className="text-sm font-bold text-destructive min-h-11 px-1 disabled:opacity-50"
            >
              {es.members.removeCta}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {es.members.removeDialogHeading(displayedName)}
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{es.members.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleRemove}
                >
                  {es.members.removeDialogConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {showLeave && (
        <div className="shrink-0 min-h-11 flex items-center">
          <AlertDialog>
            <AlertDialogTrigger
              disabled={pending}
              className="text-sm font-bold text-destructive min-h-11 px-1 disabled:opacity-50"
            >
              {es.members.leaveCta}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {es.members.leaveDialogHeading(tripName ?? '')}
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{es.members.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleLeave}
                >
                  {es.members.leaveDialogConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Right-aligned action slot (backwards-compat; empty in 02-04 via MemberList) */}
      {!showRemove && !showLeave && actionSlot && (
        <div className="shrink-0 min-h-11 flex items-center">
          {actionSlot}
        </div>
      )}
    </div>
  )
}
