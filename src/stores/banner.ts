// src/stores/banner.ts — Session-scoped Zustand store for AnonymousBanner state.
// NOT persisted (no `persist` middleware) — banner reappears on every page reload per D-12.
// Also owns the upgrade sheet open state so TopHeader and AnonymousBanner stay decoupled.

import { create } from 'zustand'

interface BannerStore {
  /** Whether the anonymous banner has been dismissed this session */
  dismissed: boolean
  /** Whether the AnonymousUpgradeSheet is open */
  upgradeSheetOpen: boolean
  /** Dismiss the banner for this session */
  dismiss: () => void
  /** Reset dismissed state (used on sign-in as new user) */
  reset: () => void
  /** Open the AnonymousUpgradeSheet */
  openUpgradeSheet: () => void
  /** Close the AnonymousUpgradeSheet */
  closeUpgradeSheet: () => void
}

export const useBannerStore = create<BannerStore>((set) => ({
  dismissed: false,
  upgradeSheetOpen: false,
  dismiss: () => set({ dismissed: true }),
  reset: () => set({ dismissed: false, upgradeSheetOpen: false }),
  openUpgradeSheet: () => set({ upgradeSheetOpen: true }),
  closeUpgradeSheet: () => set({ upgradeSheetOpen: false }),
}))
