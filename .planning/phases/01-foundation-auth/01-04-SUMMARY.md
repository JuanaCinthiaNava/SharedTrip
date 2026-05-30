---
phase: 01-foundation-auth
plan: "04"
subsystem: trip-shell
tags:
  - trip-shell
  - pwa
  - avatar
  - bottom-tabs
  - auth-guard
  - profile
dependency_graph:
  requires:
    - 01-02  # DB schema (trips, trip_members, profiles tables)
    - 01-03  # auth (signOut server action, session cookies)
  provides:
    - trip shell layout pattern (TopHeader + BottomTabBar + content area)
    - getAvatarData(userId, avatarSeed) — deterministic name + emoji + color
    - UserAvatar component — sm/md/lg sizes
    - EmptyState component — icon + heading + body + optional CTA Link
    - updateProfile server action — Zod-validated display_name UPDATE
    - PWA manifest at /manifest.webmanifest with es lang + coral icons
    - auth guard pattern (server-side redirect in /t/[tripId]/layout.tsx)
  affects:
    - 01-05  # anonymous join — reuses TopHeader (isAnonymous slot), UserAvatar, TripSwitcherSheet
tech_stack:
  added:
    - vitest ^4.1.7 (devDep — test runner for avatar.test.ts)
    - "@vitejs/plugin-react ^6.0.2 (devDep — vitest React plugin)"
    - sharp (existing devDep — used once to generate coral icon PNGs)
  patterns:
    - RHF + Zod v4 form validation in ProfileNameEditor (uses .issues not .errors for Zod v4)
    - Server Component auth guard: getUser() + redirect('/') on !user or !trip (RLS-filtered)
    - revalidatePath('/t/[tripId]', 'layout') in server action for header re-render after name update
    - AlertDialog confirmation before destructive action (sign-out)
    - Deterministic djb2 hash → {adjective, animal, emoji, color} from user ID or avatar seed
key_files:
  created:
    - src/lib/utils/avatar.ts
    - src/lib/utils/avatar.test.ts
    - src/components/profile/UserAvatar.tsx
    - src/components/profile/ProfileNameEditor.tsx
    - src/components/profile/SignOutSection.tsx
    - src/components/common/EmptyState.tsx
    - src/components/layout/BottomTabBar.tsx
    - src/components/layout/TopHeader.tsx
    - src/components/layout/TripSwitcherSheet.tsx
    - src/app/t/[tripId]/layout.tsx
    - src/app/t/[tripId]/docs/page.tsx
    - src/app/t/[tripId]/itin/page.tsx
    - src/app/t/[tripId]/gente/page.tsx
    - src/app/t/[tripId]/perfil/page.tsx
    - src/actions/profile.ts
    - src/app/manifest.ts
    - public/icon-192.png
    - public/icon-512.png
    - vitest.config.ts
  modified:
    - src/i18n/es.ts  (added tabs, profile, tripSwitcher namespaces)
    - package.json  (added vitest, @vitejs/plugin-react devDeps, test script)
decisions:
  - "AlertDialog is in SignOutSection sub-component (not inline in perfil/page.tsx) — plan allows inline or sub-component"
  - "PWA icons generated via sharp (already in node_modules as Dexie dep) — no new npm install"
  - "Zod v4 uses .issues not .errors for safeParse error access — fixed as deviation Rule 1"
  - "shadcn Button uses @base-ui/react/button without asChild prop — EmptyState uses buttonVariants + Link instead"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-29"
  tasks_completed: 3
  files_created: 19
---

# Phase 1 Plan 04: Trip Shell + Perfil + PWA Manifest Summary

**One-liner:** Coral-themed trip shell (TopHeader + BottomTabBar + TripSwitcherSheet) with deterministic emoji-avatar generator, Spanish empty-state tabs, editable display name, sign-out AlertDialog, and installable PWA manifest with branded coral icons.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Avatar generator + UserAvatar + EmptyState + es.ts extensions | bf8ab03 | avatar.ts, avatar.test.ts, UserAvatar.tsx, EmptyState.tsx, es.ts |
| 2 | BottomTabBar + TopHeader + TripSwitcherSheet + trip layout + empty tab pages | 4a55c18 | layout.tsx (trip), BottomTabBar.tsx, TopHeader.tsx, TripSwitcherSheet.tsx, docs/itin/gente pages |
| 3 | Perfil + ProfileNameEditor + updateProfile + PWA manifest + icons | bf8d261 | profile.ts, ProfileNameEditor.tsx, SignOutSection.tsx, perfil/page.tsx, manifest.ts, icon-192.png, icon-512.png |

---

## What Was Built

### Avatar Generator (`src/lib/utils/avatar.ts`)
- `getAvatarData(userId, avatarSeed?)` — deterministic djb2 hash over 30 ADJECTIVES + 30 ANIMALS
- Outputs `{ displayName, emoji, color }` — color always one of `#FF6B6B | #3DCCC7 | #FFB627`
- 7 vitest tests pass covering determinism, color validation, pattern matching, distribution

### es.ts Extensions (`src/i18n/es.ts`)
Three new namespaces added, all keys from RESEARCH Pattern 9 verbatim:
- `es.tabs` — tab labels (docs/itin/gente/perfil) + empty-state headings/bodies
- `es.profile` — display name label/placeholder, save CTA, savedToast, invalidName, sign-out dialog copy
- `es.tripSwitcher` — emptyHeading, emptyBody, createCta

**Full shape for Plan 05 (extend with `es.anon.*`):**
```typescript
export const es = {
  auth: { ... },      // Plan 03 — magic link copy
  tabs: { ... },      // Plan 04 — tab labels + empty states
  profile: { ... },   // Plan 04 — perfil tab copy
  tripSwitcher: { ... }, // Plan 04 — switcher sheet copy
  errors: { ... },    // Plan 01 — error messages
  // Plan 05 will add: anon: { pill, bannerHeading, bannerCta, ... }
} as const
```

### Trip Shell Layout (`src/app/t/[tripId]/layout.tsx`)
- **Auth guard:** `getUser()` → `redirect('/')` if no session
- **RLS guard:** `supabase.from('trips').select().eq('id', tripId).single()` → `redirect('/')` if null (user not a member)
- Fetches profile (display_name, avatar_seed) and sibling trips for TripSwitcherSheet
- Renders: `<TopHeader>` + `<main className="pt-4 pb-16">` + `<BottomTabBar>`

### TopHeader Props Signature (for Plan 05)
```typescript
interface TopHeaderProps {
  tripId: string
  tripName: string
  userId: string
  avatarSeed: string | null
  displayName: string | null
  isAnonymous?: boolean   // <- Plan 05 fills this slot with "Sin cuenta" pill
  trips: Array<{ id: string; name: string }>
}
```

### BottomTabBar
- `usePathname()` for active-tab detection
- Fixed `bottom-0`, 56px height, `bg-surface`, `border-t border-border`
- `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator
- Active: `text-primary border-b-2 border-primary`; Inactive: `text-fg-muted`
- 44px min touch height per iOS HIG

### TripSwitcherSheet
- shadcn `Sheet` with `side="bottom"`
- Lists `trips` prop (sibling trips) as Links; empty state if none
- Non-functional `+ Crear nuevo viaje` disabled button (Phase 2 wires action)

### ProfileNameEditor
- RHF + Zod v4 schema (`z.string().min(1).max(60)`)
- Pre-fills with `profile.display_name ?? getAvatarData(userId, avatarSeed).displayName`
- `useTransition` + `updateProfile` server action call
- `toast.success(es.profile.savedToast)` on success, `toast.error(error)` on failure

### SignOutSection
- `AlertDialog` from `@/components/ui/alert-dialog`
- Trigger: destructive Button with `es.profile.signOutCta`
- Confirm button calls `signOut()` from `src/actions/auth.ts`
- Cancel closes dialog without action

### updateProfile Server Action (`src/actions/profile.ts`)
- Zod validates displayName (1–60 chars)
- `getUser()` for auth check (T-04-01 defense-in-depth)
- `.update({ display_name }).eq('id', user.id)` — RLS is primary control
- `revalidatePath('/t/[tripId]', 'layout')` — triggers TopHeader re-render

### PWA Manifest (`src/app/manifest.ts`)
- Confirmed fields: `lang: 'es'`, `theme_color: '#0F1729'`, `display: 'standalone'`
- Icons: `/icon-192.png` (192×192) + `/icon-512.png` (512×512, also maskable)
- Served at `/manifest.webmanifest` (confirmed in build output)

### PWA Icons
- `public/icon-192.png` (3.2 KB) and `public/icon-512.png` (12.5 KB)
- Coral (`#FF6B6B`) background, white "S" centered, generated via sharp
- **Note:** Placeholder quality — should be redesigned in Phase 5 polish with proper brand mark

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 uses `.issues` not `.errors` for safeParse error access**
- **Found during:** Task 3 build
- **Issue:** `profile.ts` used `parsed.error.errors[0]` — Zod v4 changed to `.issues`
- **Fix:** Changed to `parsed.error.issues[0]?.message`
- **Files modified:** `src/actions/profile.ts`
- **Commit:** bf8d261 (fix was part of the same commit)

**2. [Rule 1 - Bug] shadcn Button has no `asChild` prop (uses @base-ui/react/button)**
- **Found during:** Task 1 build
- **Issue:** `EmptyState.tsx` used `<Button asChild>` — this Button variant doesn't support Radix `asChild` pattern
- **Fix:** Used `buttonVariants()` + `<Link className={buttonVariants(...)}>` instead
- **Files modified:** `src/components/common/EmptyState.tsx`
- **Commit:** bf8ab03 (fix was part of the same commit)

**3. [Rule 2 - Critical Functionality] SignOutSection extracted as separate component**
- **Reason:** The Perfil page is a Server Component; the AlertDialog requires `'use client'`. Extracting to `SignOutSection.tsx` follows the correct Server/Client boundary pattern.
- **Plan note:** Plan said "inline or as sub-component" — sub-component chosen for correct architecture.

---

## Known Stubs

None — all four tab pages render empty states explicitly (not placeholders with hardcoded "TODO"). The empty states are intentional Phase 1 states per the plan design.

---

## Threat Surface Scan

No new network endpoints beyond what the threat model covers. The `updateProfile` server action is the only new trust boundary; it is covered by T-04-01 (tampering via id substitution) and T-04-05 (DoS via oversized input). Both mitigations are implemented.

---

## Checkpoint: Human Verification Required

The plan includes a `checkpoint:human-verify` (Task 4) that requires the user to:
1. Deploy latest commit (pushed to main → Vercel auto-deploys)
2. Add themselves to the seed trip via Supabase SQL editor
3. Navigate to `/t/22222222-2222-2222-2222-222222222222/docs` and verify the shell
4. Test tab switching, trip switcher sheet, profile name edit, sign-out AlertDialog
5. Verify PWA manifest at `/manifest.webmanifest`

**Vercel URL:** https://sharedtrip.vercel.app

---

## Self-Check

### Files created exist:

All 15 created files verified FOUND (see self-check bash output above).

### Commits exist:
- bf8ab03 — Task 1 (avatar + UserAvatar + EmptyState + es.ts) — FOUND
- 4a55c18 — Task 2 (trip shell layout + tabs) — FOUND
- bf8d261 — Task 3 (Perfil + manifest + icons) — FOUND

## Self-Check: PASSED
