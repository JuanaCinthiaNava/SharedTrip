'use client'

// MemberRow — single member row: avatar + display name + role badge(s) + action slot.
// Badges (D-10): 'Creador' (coral-tinted) when user is trip creator; 'Tú' (neutral) when
// user is the current user. Both badges shown if both conditions apply (Creador first).
// The right-aligned action slot (prop: actionSlot) is reserved for 02-04 (Quitar/Salir).
// MemberRow is 'use client' because 02-04 will add interactive dialog triggers here.

import { UserAvatar } from '@/components/profile/UserAvatar'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

interface MemberRowProps {
  userId: string
  displayName: string | null | undefined
  avatarSeed: string | null | undefined
  isCreator: boolean
  isCurrentUser: boolean
  /** Right-aligned action slot — populated by 02-04 (Quitar / Salir del viaje). */
  actionSlot?: React.ReactNode
}

export function MemberRow({
  userId,
  displayName,
  avatarSeed,
  isCreator,
  isCurrentUser,
  actionSlot,
}: MemberRowProps) {
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
        {displayName ?? ''}
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

      {/* Right-aligned action slot (02-04 fills this with Quitar/Salir) */}
      {actionSlot && (
        <div className="shrink-0 min-h-11 flex items-center">
          {actionSlot}
        </div>
      )}
    </div>
  )
}
