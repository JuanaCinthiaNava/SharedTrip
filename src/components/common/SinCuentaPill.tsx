// SinCuentaPill — mango-background badge shown in TopHeader when user is anonymous (D-11).
// Plan 09: made a static, non-interactive indicator — no email-upgrade flow in v1.
// The Zustand banner-store wiring is removed; tapping the pill does nothing.
// Phase 6 will re-wire this to the email-upgrade sheet (banner store) when email returns.
// Display: mango background (bg-secondary), navy text (text-bg), 24px height per UI-SPEC.
// Color reserved-use per UI-SPEC: mango (--color-secondary) is for anonymous session indicator.

import { es } from '@/i18n/es'

export function SinCuentaPill() {
  return (
    <span
      className="inline-flex items-center bg-secondary text-bg text-[14px] font-bold px-2 py-1 rounded-full h-6"
      aria-label={es.anon.pill}
    >
      {es.anon.pill}
    </span>
  )
}
