// Perfil tab — display name editor + sign-out AlertDialog.
// Server Component that fetches user + profile, renders UserAvatar + ProfileNameEditor + SignOutSection.
// SignOutSection sub-component is in src/components/profile/SignOutSection.tsx.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { ProfileNameEditor } from '@/components/profile/ProfileNameEditor'
import { SignOutSection } from '@/components/profile/SignOutSection'
// SignOutSection uses AlertDialog from @/components/ui/alert-dialog for the confirmation modal

interface PerfilPageProps {
  params: Promise<{ tripId: string }>
}

export default async function PerfilPage({ params }: PerfilPageProps) {
  await params // tripId unused — profile is user-scoped, not trip-scoped

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_seed')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-8 max-w-md mx-auto w-full gap-6">
      {/* Large 64px avatar at the top */}
      <UserAvatar
        userId={user.id}
        avatarSeed={profile?.avatar_seed ?? null}
        displayName={profile?.display_name ?? null}
        size="lg"
      />

      {/* Display name editor — ProfileNameEditor uses updateProfile server action */}
      <div className="w-full">
        <ProfileNameEditor
          initialDisplayName={profile?.display_name ?? null}
          userId={user.id}
          avatarSeed={profile?.avatar_seed ?? null}
        />
      </div>

      {/* Sign-out section — AlertDialog confirmation before calling signOut server action */}
      <div className="w-full mt-4">
        <SignOutSection />
      </div>
    </div>
  )
}
