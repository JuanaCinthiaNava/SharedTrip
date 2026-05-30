---
phase: 01-foundation-auth
plan: "05"
subsystem: anonymous-join
tags:
  - anonymous-auth
  - join-flow
  - upgrade-flow
  - zustand
  - server-action
  - i18n
dependency_graph:
  requires:
    - 01-02  # trips + trip_members tables, invite_token, seed trip 22222222-...
    - 01-03  # @supabase/ssr factories (client.ts, server.ts)
    - 01-04  # TopHeader (isAnonymous slot), UserAvatar, trip layout
  provides:
    - joinTrip(token) server action — signs in anonymously, upserts trip_members
    - /join/[token] route — frictionless invite link handler
    - AnonymousBanner — persistent mango-striped dismissible nudge banner
    - SinCuentaPill — mango pill in TopHeader for anonymous sessions
    - AnonymousUpgradeSheet — email-only form calling updateUser({ email })
    - useBannerStore — session-scoped Zustand store (dismissed + upgradeSheetOpen)
    - ErrorToast — maps ?error= search param to known es.errors strings (T-05-07)
    - es.anon namespace — full anonymous flow i18n dictionary
  affects:
    - Phase 2 — will reuse joinTrip for real invite tokens created by trip creator
tech_stack:
  added: []
  patterns:
    - Server Action returns { tripId, error } — page handles redirect (not action)
    - UUID Zod validation in route before DB query (T-05-07 token tampering defense)
    - Zustand without persist for session-scoped dismiss (D-12)
    - updateUser({ email }) called CLIENT-SIDE (browser factory) per RESEARCH Pattern 4
    - onOpenChange wrapper to match @base-ui/react/dialog signature (open, eventDetails)
    - ErrorToast: KNOWN_ERRORS Set<string> whitelist maps unknown params to genericNetwork
key_files:
  created:
    - src/actions/members.ts
    - src/app/join/[token]/page.tsx
    - src/components/common/ErrorToast.tsx
    - src/components/common/SinCuentaPill.tsx
    - src/components/common/AnonymousBanner.tsx
    - src/components/auth/AnonymousUpgradeSheet.tsx
    - src/stores/banner.ts
  modified:
    - src/i18n/es.ts  (added anon namespace with 9 keys)
    - src/app/page.tsx  (added Suspense-wrapped ErrorToast)
    - src/components/layout/TopHeader.tsx  (filled isAnonymous slot with SinCuentaPill)
    - src/app/t/[tripId]/layout.tsx  (added AnonymousBanner when user.is_anonymous)
decisions:
  - "AnonymousUpgradeSheet open state owned by Zustand useBannerStore — both TopHeader pill and AnonymousBanner CTA open the same sheet without prop drilling (option b per plan)"
  - "AnonymousBanner rendered in trip layout (not inside TopHeader) — keeps TopHeader lean and banner dismissible independently"
  - "ErrorToast uses Set<string> allowlist against known es.errors values — prevents T-05-07 reflected XSS even though params contain pre-encoded Spanish text"
  - "onOpenChange wrapper added to match @base-ui/react/dialog signature (open: boolean, eventDetails: DialogRoot.ChangeEventDetails) vs our (open: boolean) interface"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-30"
  tasks_completed: 3
  files_created: 7
  files_modified: 4
---

# Phase 1 Plan 05: Anonymous Join + Upgrade Vertical Slice Summary

**One-liner:** Frictionless anonymous join via /join/[token] (signInAnonymously + trip_members upsert), mango "Sin cuenta" pill + dismissible upgrade banner in the trip shell, and an email-only AnonymousUpgradeSheet calling supabase.auth.updateUser({ email }) from the browser client.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | joinTrip server action + /join/[token] route + es.anon.* i18n | 5ba3f5c | members.ts, join/[token]/page.tsx, ErrorToast.tsx, es.ts, page.tsx |
| 2 | SinCuentaPill + AnonymousBanner + Zustand store + TopHeader + layout | 69bca17 | banner.ts, SinCuentaPill.tsx, AnonymousBanner.tsx, TopHeader.tsx, layout.tsx |
| 3 | AnonymousUpgradeSheet — email form + updateUser({ email }) + toast | 36a74ad | AnonymousUpgradeSheet.tsx |

---

## What Was Built

### joinTrip Server Action (`src/actions/members.ts`)

Logic per plan interfaces block:
1. `supabase.auth.getUser()` — existing session check
2. If no user → `signInAnonymously()` — returns error on failure
3. `supabase.from('trips').select('id').eq('invite_token', token).single()` — PGRST116 → `invalidJoinToken`
4. `supabase.from('trip_members').upsert({ ... }, { onConflict: 'trip_id,user_id' })` — idempotent
5. Returns `{ tripId, error }` — page handles redirect

### /join/[token] Route (`src/app/join/[token]/page.tsx`)

- Validates token as UUID with Zod before hitting the DB (T-05-01 token guessing, T-05-07 parameter injection)
- Invalid UUID → `redirect('/?error=...invalidJoinToken...')`
- Calls `joinTrip(token)` → on error redirects to `/?error=...`
- On success → `redirect('/t/{tripId}/docs')`
- Test fixture: `22222222-2222-2222-2222-222222222222` (Plan 02 seed invite token)

### es.anon Namespace (`src/i18n/es.ts`)

```typescript
anon: {
  pill: 'Sin cuenta',
  bannerHeading: 'Sin email guardado — agrega uno para no perder acceso.',
  bannerCta: 'Agregar email',
  bannerDismiss: 'Cerrar',
  upgradeSheetHeading: 'Guarda tu acceso',
  upgradeSheetBody: 'Agrega tu email para no perder acceso si cierras la app.',
  upgradeEmailLabel: 'Tu correo electrónico',
  upgradeSubmitCta: 'Guardar email',
  upgradeSuccessToast: (email: string) => `Te enviamos un correo de confirmación a ${email}. Toca el enlace para terminar.`,
}
```

Full es shape after Plan 05: `{ auth, anon, tabs, profile, tripSwitcher, errors }` as const.

### Zustand Banner Store (`src/stores/banner.ts`)

- `dismissed: boolean` + `dismiss()` + `reset()` — session-scoped banner dismiss (D-12)
- `upgradeSheetOpen: boolean` + `openUpgradeSheet()` + `closeUpgradeSheet()` — shared sheet state
- No `persist` middleware — banner reappears on every page reload per spec

### SinCuentaPill (`src/components/common/SinCuentaPill.tsx`)

- `'use client'`
- Renders a `<button>` with `bg-secondary text-bg` (mango + navy per D-11 + UI-SPEC)
- Height 24px (`h-6`) per UI-SPEC "Sin cuenta pill height: 24px"
- `onClick` calls `useBannerStore.openUpgradeSheet()`

### AnonymousBanner (`src/components/common/AnonymousBanner.tsx`)

- `'use client'`
- Reads `useBannerStore` — renders `null` if dismissed
- `border-l-4 border-secondary` — mango left accent stripe per UI-SPEC
- `animate-in slide-in-from-top duration-200` — 200ms slide-down animation per UI-SPEC
- X dismiss button calls `dismiss()` (session-scoped)
- "Agregar email" button calls `openUpgradeSheet()`
- Mounts `<AnonymousUpgradeSheet>` controlled by store

### TopHeader integration (`src/components/layout/TopHeader.tsx`)

- Fills the Plan 04 `isAnonymous` slot: `{isAnonymous && <SinCuentaPill />}` before avatar
- Mounts `AnonymousUpgradeSheet` when anonymous (Zustand store controls open state)

### Trip Layout integration (`src/app/t/[tripId]/layout.tsx`)

- `{user.is_anonymous && <AnonymousBanner />}` inserted between TopHeader and `<main>`
- No new data fetching needed — `user.is_anonymous` already present from `getUser()`

### AnonymousUpgradeSheet (`src/components/auth/AnonymousUpgradeSheet.tsx`)

- `'use client'` + browser `createClient()` (never server factory per RESEARCH Pattern 4)
- `Sheet` (base-ui/react/dialog) with `side="bottom"`, controlled via `open`/`onOpenChange`
- RHF + Zod schema: `z.object({ email: z.string().email() })`
- On submit: `supabase.auth.updateUser({ email })` → success toast or error toast
- Handles Supabase auto-verify bug (issue #29350): toast shown regardless of whether confirmation link is needed

### ErrorToast (`src/components/common/ErrorToast.tsx`)

- `'use client'` — reads `useSearchParams().get('error')`
- Maps decoded param against `KNOWN_ERRORS: Set<string>` of all `es.errors.*` values
- Unknown values show `es.errors.genericNetwork` (T-05-07 mitigation — no param echo)
- Wrapped in `<Suspense>` in `page.tsx` (required for `useSearchParams`)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @base-ui/react/dialog onOpenChange signature mismatch**
- **Found during:** Task 2 build + Task 3 review
- **Issue:** `Dialog.Root.onOpenChange` in `@base-ui/react` has signature `(open: boolean, eventDetails: DialogRoot.ChangeEventDetails) => void` — two arguments, not one. Our `onOpenChange: (open: boolean) => void` prop caused TypeScript errors.
- **Fix:** Wrapped all `onOpenChange` handlers as `(nextOpen) => (nextOpen ? open() : close())` to accept the first arg and ignore the second.
- **Files modified:** `AnonymousUpgradeSheet.tsx`, `TopHeader.tsx`, `AnonymousBanner.tsx`
- **Commit:** 36a74ad (AnonymousUpgradeSheet commit), 69bca17 (TopHeader + AnonymousBanner)

**2. [Rule 1 - Bug] TypeScript `as const` Set membership type error in ErrorToast**
- **Found during:** Task 1 build
- **Issue:** `KNOWN_ERRORS = new Set([es.errors.invalidLink, ...])` inferred as `Set<"Este enlace..."|"No pudimos..."|...>` — a typed literal union. `KNOWN_ERRORS.has(decoded)` where `decoded: string` triggered TS error "Argument of type 'string' is not assignable to parameter of type '...'".
- **Fix:** Typed the Set explicitly as `Set<string>` — preserves the allowlist semantics while satisfying TypeScript.
- **Files modified:** `src/components/common/ErrorToast.tsx`
- **Commit:** 5ba3f5c

**3. [Rule 3 - Dependency] AnonymousUpgradeSheet created in Task 2 instead of Task 3**
- **Reason:** `TopHeader.tsx` and `AnonymousBanner.tsx` (Task 2 files) import `AnonymousUpgradeSheet`. The build would fail without it. Task 3's full implementation was created immediately to resolve the blocking import.
- **Impact:** Task 2 and Task 3 are committed as separate commits in order, but `AnonymousUpgradeSheet.tsx` was authored before the Task 2 commit. This is a normal implementation dependency — no plan-level change needed.

---

## Test Fixture

Plan 02 seed trip: `11111111-1111-1111-1111-111111111111`
Seed invite token: `22222222-2222-2222-2222-222222222222`
Test URL: `https://sharedtrip.vercel.app/join/22222222-2222-2222-2222-222222222222`

Expected flow: Safari loads → brief /join/... → lands at /t/11111111.../docs with mango pill + mango banner, no email required.

---

## Phase 1 Success Criteria Status

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. App loads on real iPhone via HTTPS | Done (Plan 01-01) | Deployed to https://sharedtrip.vercel.app |
| 2. Magic link with unique subject + persistent session | Done (Plan 01-03) | signInWithOtp + @supabase/ssr cookies |
| 3. Anonymous join via invite URL (no email required) | Done (this plan) | /join/[token] + signInAnonymously + trip_members upsert |
| 4. Anonymous upgrade preserves trip membership | Done (this plan) | updateUser({ email }) — user_id unchanged per Supabase docs |
| 5. GitHub Actions cron + all strings in es.ts | Done (Plans 01-02, 01-03, 01-04, 01-05) | keep-alive.yml + es.ts with all namespaces |

---

## Known Stubs

None — all components render meaningful UI or functional logic. No hardcoded placeholder text.

---

## Threat Surface Scan

All items covered by the plan's threat model. ErrorToast (T-05-07) is new surface not in prior plans:

| Flag | File | Description |
|------|------|-------------|
| threat_flag: input_handling | src/components/common/ErrorToast.tsx | Reads URL ?error= param — mitigated by KNOWN_ERRORS allowlist; no raw echo |

No new network endpoints beyond /join/[token] (covered by T-05-01/02 in plan threat register).

---

## Self-Check

### Files created exist:
- src/actions/members.ts — FOUND
- src/app/join/[token]/page.tsx — FOUND
- src/components/common/ErrorToast.tsx — FOUND
- src/components/common/SinCuentaPill.tsx — FOUND
- src/components/common/AnonymousBanner.tsx — FOUND
- src/components/auth/AnonymousUpgradeSheet.tsx — FOUND
- src/stores/banner.ts — FOUND

### Commits exist:
- 5ba3f5c — Task 1 (joinTrip + join route + es.anon + ErrorToast) — FOUND
- 69bca17 — Task 2 (SinCuentaPill + AnonymousBanner + store + TopHeader + layout) — FOUND
- 36a74ad — Task 3 (AnonymousUpgradeSheet) — FOUND

### Build: PASSED (npm run build exits 0, all routes compile)

## Self-Check: PASSED
