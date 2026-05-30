// src/app/t/[tripId]/layout.tsx — Trip shell layout with auth guard.
// Server Component: fetches user, trip, profile, and sibling trips.
// Auth guard: redirects unauthenticated users to / (server-side).
// RLS guard: if user is not a trip member, Supabase returns null → redirect to /.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { AnonymousBanner } from '@/components/common/AnonymousBanner'

interface TripLayoutProps {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { tripId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Auth guard: redirect unauthenticated users to welcome/login screen
  if (!user) {
    redirect('/')
  }

  // Fetch the trip — RLS ensures only members can see it
  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', tripId)
    .single()

  // If trip not found (RLS denied or invalid ID), redirect to root
  if (!trip) {
    redirect('/')
  }

  // Fetch user's other trips for the trip switcher
  const { data: userTrips } = await supabase
    .from('trip_members')
    .select('trips(id, name)')
    .eq('user_id', user.id)
    .neq('trip_id', tripId)

  // Flatten the nested trips relation result
  const otherTrips = (userTrips ?? [])
    .map((tm) => tm.trips)
    .filter((t): t is { id: string; name: string } => t !== null)

  // Fetch own profile for avatar + display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_seed')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-dvh bg-bg">
      <TopHeader
        tripId={tripId}
        tripName={trip.name}
        userId={user.id}
        avatarSeed={profile?.avatar_seed ?? null}
        displayName={profile?.display_name ?? null}
        isAnonymous={user.is_anonymous ?? false}
        trips={otherTrips}
      />
      {/* Plan 05: AnonymousBanner shown below header when user is anonymous (D-12) */}
      {user.is_anonymous && <AnonymousBanner />}
      <main className="pt-4 pb-16">
        {children}
      </main>
      <BottomTabBar tripId={tripId} />
    </div>
  )
}
