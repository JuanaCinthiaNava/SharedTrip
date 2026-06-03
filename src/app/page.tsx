// Welcome screen — typed invite-code entry (Plan 09 re-scope from magic-link to code entry)
// Server Component with a session guard: a returning authenticated member is routed straight
// back into their trip (so reopening the browser feels like "I'm still in"), otherwise the
// pure welcome UI with the code-entry form is shown.
// InviteCodeForm is a 'use client' component that validates the code and navigates to /join/{code}.
// Plan 05: ErrorToast reads the ?error= search param and shows a Sonner toast.
// All text via es.entry — zero hardcoded Spanish strings here.

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Wordmark } from '@/components/common/Wordmark'
import { InviteCodeForm } from '@/components/auth/InviteCodeForm'
import { ErrorToast } from '@/components/common/ErrorToast'
import { es } from '@/i18n/es'

export default async function WelcomePage() {
  // Session guard: if the visitor already holds a session AND is a member of at least one trip,
  // send them back into that trip instead of showing the code form. This is what makes the
  // anonymous session feel persistent across browser restarts (AUTH-03): reopening Safari lands
  // on / but a logged-in member is redirected into their trip rather than seeing an empty form.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: memberships } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id)
      .limit(1)

    if (memberships && memberships.length > 0) {
      redirect(`/t/${memberships[0].trip_id}/docs`)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 min-h-dvh flex flex-col py-12">
      {/* ErrorToast — shows a toast if ?error= param is present (e.g. from /join/[code] failure) */}
      {/* Wrapped in Suspense because useSearchParams() requires a client boundary */}
      <Suspense fallback={null}>
        <ErrorToast />
      </Suspense>

      {/* Top third: wordmark */}
      <div className="flex flex-col items-center pt-12">
        <Wordmark size="lg" />
      </div>

      {/* Middle: heading + subheading — describe code entry, not email */}
      <div className="flex flex-col items-center text-center mt-6 flex-1">
        <h1 className="text-[28px] font-bold leading-[1.2] text-fg">
          {es.entry.heading}
        </h1>
        <p className="text-base text-fg-muted mt-4 leading-[1.5]">
          {es.entry.subheading}
        </p>
      </div>

      {/* Bottom third: sticky CTA — InviteCodeForm (Plan 09 invite-code entry) */}
      {/* UI-SPEC focal-point: sticky bottom-6 so the form stays visible above the soft keyboard */}
      <div className="sticky bottom-6 mt-auto pb-0">
        <InviteCodeForm />
      </div>
    </main>
  )
}
