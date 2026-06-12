// Gente tab — Phase 2 member list + invite card (RSC).
// Fetches trip (name, invite_code, created_by) + members (trip_members JOIN profiles).
// RLS ensures only authenticated trip members can see this page.
// InviteCard is pinned at top (D-07); doubles as empty state for sole member.
// MemberList rendered only when ≥1 co-member exists.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteCard } from '@/components/members/InviteCard'
import { MemberList } from '@/components/members/MemberList'
import { EditTripSheet } from '@/components/trip/EditTripSheet'
import { DeleteTripDialog } from '@/components/trip/DeleteTripDialog'
import { formatTripRange } from '@/lib/utils/date-format'
import { es } from '@/i18n/es'

interface GentePageProps {
  params: Promise<{ tripId: string }>
}

export default async function GentePage({ params }: GentePageProps) {
  const { tripId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Auth guard — layout already guards, but be explicit here too
  if (!user) {
    redirect('/')
  }

  // Fetch trip fields — RLS member-gated SELECT
  // start_date, end_date, description needed to pre-fill EditTripSheet (D-14)
  const { data: trip } = await supabase
    .from('trips')
    .select('name, invite_code, created_by, start_date, end_date, description')
    .eq('id', tripId)
    .single()

  if (!trip) {
    redirect('/')
  }

  // Fetch members with profile data — member-gated RLS (T-02-07 mitigated)
  // The `profiles(...)` embed resolves via the trip_members.user_id -> profiles.id FK
  // (migration 20260530000007). NEVER discard `error` here: a failed query that falls back
  // to [] silently renders an empty member list — exactly the PGRST200 embed-FK bug that hid
  // every co-member in Phase 02 (UAT Test 5). Surface it instead.
  const { data: rawMembers, error: membersError } = await supabase
    .from('trip_members')
    .select('user_id, role, profiles(display_name, avatar_seed)')
    .eq('trip_id', tripId)

  if (membersError) {
    console.error('[GentePage] trip_members query failed:', membersError.message)
  }

  // Flatten the nested profiles relation (mirrors layout.tsx:48-51 pattern)
  const members = (rawMembers ?? []).map((tm) => ({
    user_id: tm.user_id,
    role: tm.role,
    profiles: Array.isArray(tm.profiles) ? tm.profiles[0] ?? null : (tm.profiles ?? null),
  }))

  const currentUserId = user.id
  const creatorId = trip.created_by

  // Show the member list section only when there are co-members (D-07: invite card IS the empty state)
  const hasCoMembers = members.some((m) => m.user_id !== currentUserId)

  const isCreator = currentUserId === creatorId

  // Trip dates rendered in es-MX format (UI-05 / SC5). Null when no dates set (D-03) → row hidden.
  const tripDates = formatTripRange(trip.start_date ?? null, trip.end_date ?? null)

  return (
    <div className="flex flex-col gap-8 px-4 py-4">
      {/* Trip header — name + es-MX date range (UI-05). The trip-info surface for Phase 2. */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold leading-[1.2] text-fg">{trip.name}</h1>
        {tripDates && <p className="text-sm text-fg-muted">{tripDates}</p>}
      </header>

      {/* Creator-only edit affordance — atop Gente per UI-SPEC §2 / RESEARCH Open Q3 */}
      {isCreator && (
        <EditTripSheet
          tripId={tripId}
          name={trip.name}
          startDate={trip.start_date ?? null}
          endDate={trip.end_date ?? null}
          description={trip.description ?? null}
        />
      )}

      {/* D-07: Invite card pinned at top; doubles as empty state when sole member */}
      <InviteCard name={trip.name} code={trip.invite_code} />

      {/* Member list — only shown when there is ≥1 co-member */}
      {hasCoMembers && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold leading-[1.3] text-fg">
            {es.members.heading}
          </h2>
          <MemberList
            members={members}
            currentUserId={currentUserId}
            creatorId={creatorId}
            tripId={tripId}
            tripName={trip.name}
          />
        </section>
      )}

      {/* D-15/D-16/D-17: Creator-only delete affordance — lowest, de-emphasized, destructive.
          This is the creator's sole exit from the trip (D-15: no "Salir" for the creator).
          Hard delete only — no archive (D-16). Type-exact-name to confirm (D-17). */}
      {isCreator && (
        <div className="pt-4 border-t border-border/30">
          <DeleteTripDialog tripId={tripId} name={trip.name} />
        </div>
      )}
    </div>
  )
}
