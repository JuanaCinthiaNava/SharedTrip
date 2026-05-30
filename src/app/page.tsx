// Welcome screen — magic link auth entry point (Plan 01-03)
// Server Component: no auth, no data fetching — pure welcome UI.
// MagicLinkForm is a 'use client' component that handles the form submission.
// Plan 05: ErrorToast reads the ?error= search param and shows a Sonner toast.
// All text via es.auth — zero hardcoded Spanish strings here.

import { Suspense } from 'react'
import { Wordmark } from '@/components/common/Wordmark'
import { MagicLinkForm } from '@/components/auth/MagicLinkForm'
import { ErrorToast } from '@/components/common/ErrorToast'
import { es } from '@/i18n/es'

export default function WelcomePage() {
  return (
    <main className="mx-auto max-w-md px-4 min-h-dvh flex flex-col py-12">
      {/* ErrorToast — shows a toast if ?error= param is present (e.g. from /join/[token] failure) */}
      {/* Wrapped in Suspense because useSearchParams() requires a client boundary */}
      <Suspense fallback={null}>
        <ErrorToast />
      </Suspense>

      {/* Top third: wordmark */}
      <div className="flex flex-col items-center pt-12">
        <Wordmark size="lg" />
      </div>

      {/* Middle: heading + subheading */}
      <div className="flex flex-col items-center text-center mt-6 flex-1">
        <h1 className="text-[28px] font-bold leading-[1.2] text-fg">
          {es.auth.welcomeHeading}
        </h1>
        <p className="text-base text-fg-muted mt-4 leading-[1.5]">
          {es.auth.welcomeSubheading}
        </p>
      </div>

      {/* Bottom third: sticky CTA — MagicLinkForm replaces the disabled button placeholder from Plan 01 */}
      {/* UI-SPEC focal-point: sticky bottom-6 so the form stays visible above the soft keyboard */}
      <div className="sticky bottom-6 mt-auto pb-0">
        <MagicLinkForm />
      </div>
    </main>
  )
}
