// MemberList — renders the ordered list of MemberRow components.
// RSC: receives pre-fetched member data from gente/page.tsx (RSC parent).
// Passes creatorId and currentUserId down to each MemberRow for badge logic.
// The actionSlot prop on MemberRow is left empty here — 02-04 will inject
// Quitar/Salir affordances into MemberRow by extending this component.

import { MemberRow } from './MemberRow'

interface Member {
  user_id: string
  role: string
  profiles: {
    display_name: string | null
    avatar_seed: string | null
  } | null
}

interface MemberListProps {
  members: Member[]
  currentUserId: string
  creatorId: string
  tripId: string
  tripName: string
}

export function MemberList({
  members,
  currentUserId,
  creatorId,
}: MemberListProps) {
  return (
    <div className="flex flex-col">
      {members.map((member) => (
        <MemberRow
          key={member.user_id}
          userId={member.user_id}
          displayName={member.profiles?.display_name}
          avatarSeed={member.profiles?.avatar_seed}
          isCreator={member.user_id === creatorId}
          isCurrentUser={member.user_id === currentUserId}
          // actionSlot intentionally omitted — 02-04 wires Quitar/Salir
        />
      ))}
    </div>
  )
}
