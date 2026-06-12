// Welcome screen — typed invite-code entry (Plan 09 re-scope from magic-link to code entry)
// Server Component with a session guard: a returning authenticated member is routed straight
// back into their trip (so reopening the browser feels like "I'm still in"), otherwise the
// pure welcome UI with the code-entry form is shown.
// InviteCodeForm is a 'use client' component that validates the code and navigates to /join/{code}.
// Plan 05: ErrorToast reads the ?error= search param and shows a Sonner toast.
// Plan 02-02: Two-choice welcome (D-01) — "Ya me invitaron" (primary) + "Quiero crear" (secondary).
// All text via es.* — zero hardcoded Spanish strings here.

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Wordmark } from '@/components/common/Wordmark'
import { InviteCodeForm } from '@/components/auth/InviteCodeForm'
import { ErrorToast } from '@/components/common/ErrorToast'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isWellFormedInviteCode, normalizeInviteCode } from '@/lib/utils/invite-code'
import { es } from '@/i18n/es'

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  // Progressive enhancement for code entry (02 UAT): InviteCodeForm navigates via client JS to
  // /join/{code}. If that JS never runs — hydration hiccup, a stale PWA service worker serving
  // mismatched chunks, or JS disabled — the form falls back to a NATIVE GET submit, which lands
  // on /?code=XXX (the input is name="code"). Without this guard that param is ignored and the
  // submit appears to "do nothing". Honor it here server-side so typed-code entry works with or
  // without JS: a well-formed code redirects straight into the join handler.
  const { code } = await searchParams
  if (code && isWellFormedInviteCode(code)) {
    redirect(`/join/${encodeURIComponent(normalizeInviteCode(code))}`)
  }

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

      {/* Bottom third: sticky CTA area */}
      {/* UI-SPEC focal-point: sticky bottom-6 so the form stays visible above the soft keyboard */}
      <div className="sticky bottom-6 mt-auto pb-0 flex flex-col gap-4">
        {/* Primary: invite-code join form (unchanged from Plan 09) */}
        <InviteCodeForm />

        {/* "o" divider — two border rules flanking a muted label (UI-SPEC §1, D-01) */}
        <div className="flex items-center gap-3">
          <span className="flex-1 border-t border-border" />
          <span className="text-sm text-muted-foreground select-none">o</span>
          <span className="flex-1 border-t border-border" />
        </div>

        {/* Secondary: create trip affordance — outline link (NOT solid-coral, must not outweigh join) */}
        <Link
          href="/trips/nueva"
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
        >
          {es.trip.createCta}
        </Link>
      </div>
    </main>
  )
}
