// Welcome screen — first vertical slice (Plan 01-01)
// Server Component: no auth, no data fetching — pure welcome UI.
// All text via es.auth — zero hardcoded Spanish strings here.

import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/common/Wordmark'
import { es } from '@/i18n/es'

export default function WelcomePage() {
  return (
    <main className="mx-auto max-w-md px-4 min-h-dvh flex flex-col py-12">
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

      {/* Bottom third: sticky CTA (wired in Plan 03 — disabled visual anchor for now) */}
      <div className="pb-6">
        <Button
          className="w-full sticky bottom-6"
          disabled
        >
          {es.auth.sendLinkCta}
        </Button>
      </div>
    </main>
  )
}
