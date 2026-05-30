'use client'

// SinCuentaPill — mango-background badge shown in TopHeader when user is anonymous.
// Tapping the pill opens the AnonymousUpgradeSheet via the Zustand useBannerStore.
// Display: mango background (bg-secondary), navy text (text-bg), 24px height per UI-SPEC.
// Color reserved-use per UI-SPEC: mango (--color-secondary) is for anonymous session indicator.

import { es } from '@/i18n/es'
import { useBannerStore } from '@/stores/banner'

export function SinCuentaPill() {
  const openUpgradeSheet = useBannerStore((s) => s.openUpgradeSheet)

  return (
    <button
      type="button"
      onClick={openUpgradeSheet}
      className="inline-flex items-center bg-secondary text-bg text-[14px] font-bold px-2 py-1 rounded-full h-6 cursor-pointer"
      aria-label={es.anon.pill}
    >
      {es.anon.pill}
    </button>
  )
}
