// MemberList — renders the ordered list of MemberRow components.
// RSC: receives pre-fetched member data from gente/page.tsx (RSC parent).
// Passes creatorId, currentUserId, tripId, tripName down to each MemberRow.
// 02-04: MemberRow now renders inline Quitar/Salir actions via AlertDialog confirms.

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
  tripId,
  tripName,
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
          creatorId={creatorId}
          currentUserId={currentUserId}
          tripId={tripId}
          tripName={tripName}
        />
      ))}
    </div>
  )
}
