'use client'

// AnonymousBanner — persistent dismissible nudge banner shown below TopHeader when anonymous.
// Position: between TopHeader and page content in the trip layout.
// Mango left accent stripe (border-l-4 border-secondary) per UI-SPEC.
// Session-scoped dismiss via Zustand useBannerStore (NOT persisted — reappears on reload per D-12).
// CTA "Agregar email" opens AnonymousUpgradeSheet via the same Zustand store.
// Animation: slides down from header on mount (Tailwind animate-in).

import { X } from 'lucide-react'
import { es } from '@/i18n/es'
import { useBannerStore } from '@/stores/banner'
import { AnonymousUpgradeSheet } from '@/components/auth/AnonymousUpgradeSheet'

export function AnonymousBanner() {
  const { dismissed, dismiss, upgradeSheetOpen, openUpgradeSheet, closeUpgradeSheet } =
    useBannerStore()

  // If user dismissed the banner this session, render nothing
  if (dismissed) return null

  return (
    <>
      <div
        role="banner"
        className="flex items-center gap-3 px-4 py-3 bg-surface border-l-4 border-secondary animate-in slide-in-from-top duration-200"
      >
        {/* Banner message */}
        <p className="flex-1 text-base text-fg leading-[1.5]">
          {es.anon.bannerHeading}
        </p>

        {/* CTA: open upgrade sheet */}
        <button
          type="button"
          onClick={openUpgradeSheet}
          className="shrink-0 text-[14px] font-bold text-secondary underline underline-offset-2"
        >
          {es.anon.bannerCta}
        </button>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-fg-muted hover:text-fg transition-colors"
          aria-label={es.anon.bannerDismiss}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Upgrade sheet — controlled by Zustand store */}
      <AnonymousUpgradeSheet
        open={upgradeSheetOpen}
        onOpenChange={(nextOpen) => (nextOpen ? openUpgradeSheet() : closeUpgradeSheet())}
      />
    </>
  )
}
