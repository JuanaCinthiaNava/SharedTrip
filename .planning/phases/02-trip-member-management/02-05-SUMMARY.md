---
phase: 02-trip-member-management
plan: 05
subsystem: ui
tags: [supabase, rls, server-actions, react, typescript, alert-dialog, sheet, forms]

# Dependency graph
requires:
  - phase: 02-trip-member-management/02-01
    provides: parseLocalDate/formatTripRange date helpers, es.ts trip namespace
  - phase: 02-trip-member-management/02-02
    provides: CreateTripForm with defaultValues + onSubmit override, createTrip action
  - phase: 02-trip-member-management/02-03
    provides: gente/page.tsx RSC structure with InviteCard + MemberList to preserve
provides:
  - updateTrip server action (plain RLS, no service-role)
  - deleteTrip server action (plain RLS, ON DELETE CASCADE)
  - EditTripSheet component (Sheet wrapping pre-filled CreateTripForm)
  - DeleteTripDialog component (AlertDialog + type-name-to-confirm gate)
  - Creator-only edit + delete affordances on Gente page
affects:
  - phase-03-document-vault (trip deletion cascades — documents table children)
  - phase-04-itinerary (trip deletion cascades — itinerary_items children)
  - phase-05-polish (creator UX verification)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "updateTrip/deleteTrip run under normal RLS (plain SSR client); only createTrip needs service-role"
    - "EditTripSheet reuses CreateTripForm via defaultValues + onSubmit override — no form duplication"
    - "AlertDialog + controlled Input type-to-confirm gate for highest-stakes destructive actions"
    - "startTransition wrapping async server action + toast.error/success + router.refresh() pattern"

key-files:
  created:
    - src/components/trip/EditTripSheet.tsx
    - src/components/trip/DeleteTripDialog.tsx
  modified:
    - src/actions/trips.ts
    - src/app/t/[tripId]/gente/page.tsx

key-decisions:
  - "updateTrip signature refactored to (tripId, input) for clean EditTripSheet call at point of use"
  - "revalidatePath('/t/{tripId}', 'layout') + revalidatePath('/', 'layout') covers trip header + switcher after edit"
  - "EditTripSheet side=bottom (mobile-first) — user already on Gente tab at bottom of navigation"
  - "DeleteTripDialog trigger uses ghost+destructive variant (de-emphasized per D-15) not a solid red button"

patterns-established:
  - "Creator gate: isCreator = currentUserId === creatorId computed in RSC, passed as conditional render"
  - "Type-to-confirm: confirmValue === name (trim-exact, case-sensitive) disables/enables AlertDialogAction"

requirements-completed: [TRIP-08, TRIP-09]

# Metrics
duration: 25min
completed: 2026-06-05
---

# Phase 02 Plan 05: Trip Lifecycle — Edit + Delete Summary

**Creator edit/delete surface: updateTrip + deleteTrip server actions under RLS, EditTripSheet reusing pre-filled CreateTripForm, and AlertDialog type-the-exact-name delete confirmation — creator-only, hard delete, no archive**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-05T20:30:00Z
- **Completed:** 2026-06-05T20:55:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `updateTrip` + `deleteTrip` server actions added to `trips.ts` — plain SSR client, creator-only RLS, no service-role bypass
- `EditTripSheet` created: Sheet (side=bottom) wrapping `CreateTripForm` pre-filled from current trip values; `onSubmit` override calls `updateTrip(tripId, input)` + `router.refresh()`
- `DeleteTripDialog` created: `AlertDialog` with controlled `Input` type-to-confirm gate (D-17); confirm button disabled until `confirmValue === trip.name` (trim-exact, case-sensitive); success path calls `router.push('/')` after cascade
- `gente/page.tsx` extended: fetches `start_date`/`end_date`/`description` for edit pre-fill; renders both `EditTripSheet` and `DeleteTripDialog` gated on `isCreator = currentUserId === creatorId`

## Task Commits

1. **Task 1: updateTrip + deleteTrip server actions** - `65cbc0e` (feat)
2. **Task 2: EditTripSheet + creator-only edit affordance** - `562ddec` (feat)
3. **Task 3: DeleteTripDialog + creator-only delete affordance** - `1e86ecc` (feat)

## Files Created/Modified

- `src/actions/trips.ts` — Added `updateTrip(tripId, input)` + `deleteTrip(tripId)` under plain RLS; refactored `updateTrip` signature to separate `tripId` from input object; added layout revalidation
- `src/components/trip/EditTripSheet.tsx` — New: Sheet trigger + `CreateTripForm` pre-filled via `defaultValues`; `onSubmit` override → `updateTrip` → toast + `router.refresh()`
- `src/components/trip/DeleteTripDialog.tsx` — New: AlertDialog with controlled Input type-to-confirm gate, destructive confirm → `deleteTrip` → `router.push('/')`, hard delete only (no archive)
- `src/app/t/[tripId]/gente/page.tsx` — Imported `EditTripSheet` + `DeleteTripDialog`; extended SELECT to include `start_date`, `end_date`, `description`; added creator-only render guards

## Decisions Made

- **updateTrip signature** changed to `(tripId: string, input: {...})` separating the row selector from the payload — matches the plan's interface contract and makes the EditTripSheet call site cleaner
- **revalidatePath** extended to also revalidate `/` layout so the trip switcher's date display refreshes after an edit
- **EditTripSheet side=bottom** — matches mobile-first usage context (user is already at bottom navigation)
- **DeleteTripDialog trigger** uses `variant="ghost"` + `text-destructive` coloring rather than a solid destructive button — de-emphasized as the lowest affordance (D-15)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Signature] Refactored updateTrip to (tripId, input) from bundled UpdateTripInput**
- **Found during:** Task 1 (reviewing plan's interface contract vs. pre-existing stub)
- **Issue:** `trips.ts` pre-populated with `updateTrip(input: UpdateTripInput)` bundled tripId inside — plan specifies `updateTrip(tripId, input)` for clean caller ergonomics in EditTripSheet
- **Fix:** Refactored to `updateTrip(tripId: string, input: {...})` matching plan interface; added `revalidatePath('/', 'layout')` for trip switcher freshness
- **Files modified:** `src/actions/trips.ts`
- **Verification:** `tsc --noEmit` exits 0 with new signature
- **Committed in:** `65cbc0e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (signature alignment)
**Impact on plan:** Non-breaking cleanup for call site ergonomics. No scope creep.

## Issues Encountered

None — all three tasks executed cleanly. TypeScript was clean at every step; `npm run build` exited 0 on Task 3.

## Threat Model Verification

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-02-15: non-creator forging updateTrip/deleteTrip | Plain SSR client — RLS creator-only policies deny non-creator mutations at DB | SUPABASE_SECRET_KEY grep returns 0 in both functions |
| T-02-16: accidental destructive delete | Type-the-exact-name AlertDialog gate; confirm button disabled until exact match | Controlled Input + `confirmValue === name` guard present |
| T-02-17: actor spoofing | `getUser()` in both actions; tripId is only a row selector | Auth check present in both updateTrip + deleteTrip |
| T-02-18: cascade scope | ON DELETE CASCADE intentionally wipes trip children | No partial-delete logic added; accepted |

## User Setup Required

None — no new environment variables, no external service configuration, no migrations required. Hard delete uses existing ON DELETE CASCADE schema (already in production).

## Next Phase Readiness

- Trip lifecycle mutations complete: create (02-02), edit (02-05), delete (02-05)
- Phase 02 is now complete (plans 01–05 all done)
- Phase 03: Document Vault + PWA Offline can begin — `deleteTrip` cascade will wipe `documents` children, which Phase 03 creates

---
*Phase: 02-trip-member-management*
*Completed: 2026-06-05*
