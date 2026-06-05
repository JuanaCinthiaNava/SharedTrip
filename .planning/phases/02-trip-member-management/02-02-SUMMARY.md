---
phase: 02-trip-member-management
plan: 02
subsystem: api, ui, auth
tags: [supabase, service-role, anonymous-auth, react-hook-form, zod-v4, react-day-picker, shadcn, trip-creation]

# Dependency graph
requires:
  - phase: 02-01
    provides: generateInviteCode, toLocalDateString/parseLocalDate, es.trip/members/invite namespaces, Calendar + Textarea primitives
  - phase: 01-foundation-auth
    provides: joinTripByCode service-role pattern, @supabase/ssr, anonymous auth, es.ts structure

provides:
  - createTrip Server Action (src/actions/trips.ts) — service-role bounded mutation with collision-retry
  - updateTrip / deleteTrip Server Actions (src/actions/trips.ts) — RLS-guarded stubs for 02-05
  - POST /trips/new route handler — writes anon-session cookie + redirects to /t/[id]/gente
  - CreateTripForm (src/components/trip/CreateTripForm.tsx) — RHF+Zod v4, reusable for edit (02-05)
  - TripDatePicker (src/components/trip/TripDatePicker.tsx) — clearable range calendar, no required prop
  - Two-choice welcome screen (src/app/page.tsx) — join (primary) + create (secondary) affordances
  - GET /trips/nueva page — dedicated create trip screen rendering CreateTripForm

affects:
  - 02-03 (InviteCard will consume the invite_code generated here)
  - 02-04 (gente page will receive the trip_members admin row created here)
  - 02-05 (edit trip will reuse CreateTripForm via defaultValues + onSubmit override)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Service-role bounded mutation: createTrip mirrors joinTripByCode — identity from getUser()/signInAnonymously(), never request body
    - invite_code 5-attempt collision retry on Postgres 23505 unique_violation
    - Route handler for create (writes anon-session cookie): POST /trips/new
    - RHF + Zod v4 with z.custom<DateRange> for react-day-picker range field
    - toLocalDateString for date serialization (never .toISOString()) — guards UTC-6 off-by-one

key-files:
  created:
    - src/actions/trips.ts
    - src/app/trips/new/route.ts
    - src/components/trip/CreateTripForm.tsx
    - src/components/trip/TripDatePicker.tsx
    - src/app/trips/nueva/page.tsx
  modified:
    - src/app/page.tsx (two-choice welcome — secondary create affordance added)

key-decisions:
  - "Create page at /trips/nueva (GET) + route handler at /trips/new (POST) — avoids Next.js conflict between page and route handler in the same directory segment"
  - "DateRange field typed as z.custom<DateRange | undefined> in Zod schema — required because DateRange.from is a required (but possibly undefined) field, not an optional property"
  - "Create button on welcome screen uses buttonVariants + Next.js Link (not Button asChild) — base-ui Button does not use the Radix Slot/asChild pattern"
  - "updateTrip/deleteTrip stubs included in trips.ts for 02-05 reuse under normal RLS — create path alone uses service-role"

patterns-established:
  - "Route-handler-plus-action split: POST handler writes session cookie; createTrip action does the bounded mutation"
  - "Zod v4 z.custom<T> for complex form field types that don't serialize cleanly via z.object"

requirements-completed: [TRIP-01, TRIP-02, TRIP-03]

# Metrics
duration: 15min
completed: "2026-06-05"
tasks: 3
files: 6
---

# Phase 02 Plan 02: createTrip + CreateTripForm + Two-choice Welcome

**End-to-end trip creation: service-role bounded mutation with 5-attempt invite_code retry, clearable RHF+Zod v4 date-range form, and two-choice welcome screen landing creator in /t/[id]/gente as admin.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-06-05
- **Tasks:** 3
- **Files created/modified:** 6

## Accomplishments

- `createTrip` Server Action mirrors `joinTripByCode` exactly: identity from server session only (T-02-02 mitigated), service-role client (`SUPABASE_SECRET_KEY`), 5-attempt invite_code collision retry on Postgres 23505, creator upserted as `role: 'admin'` (T-02-04 bounded to two inserts)
- `CreateTripForm` is RHF + Zod v4 with `mode: 'onBlur'`, clearable `TripDatePicker`, optional description via Textarea; dates serialized via `toLocalDateString` (no `toISOString`); `defaultValues` + `onSubmit` override wired for edit reuse in 02-05
- Two-choice welcome screen: `InviteCodeForm` stays primary/sticky, "Crear viaje" secondary outline link with "o" divider; all strings via `es.ts`; zero hardcoded Spanish

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | createTrip action + /trips/new route handler | 8b9f3f5 |
| 2 | CreateTripForm + TripDatePicker | 9c6b698 |
| 3 | Two-choice welcome + /trips/nueva page | 6576b7a |

## Files Created/Modified

- `src/actions/trips.ts` — createTrip (service-role) + updateTrip/deleteTrip stubs (RLS)
- `src/app/trips/new/route.ts` — POST handler: parses body, calls createTrip, redirects to /t/[id]/gente
- `src/components/trip/TripDatePicker.tsx` — shadcn Calendar in mode="range", "Sin fechas" clear button, no required prop
- `src/components/trip/CreateTripForm.tsx` — RHF + Zod v4, name/dateRange/description fields, fetch POST to /trips/new
- `src/app/trips/nueva/page.tsx` — GET page rendering CreateTripForm under a clean heading
- `src/app/page.tsx` — Added "o" divider + secondary "Crear viaje" outline Link below InviteCodeForm

## Decisions Made

- **`/trips/nueva` (GET) + `/trips/new` (POST):** Next.js forbids a `page.tsx` and `route.ts` in the same directory. Kept the POST handler at `/trips/new` (matching the form's submit target) and created the create page at `/trips/nueva` (clean Spanish URL, avoids conflict).
- **`z.custom<DateRange | undefined>` for date field:** The `DateRange` type from `react-day-picker` has `from: Date | undefined` (required field that can be undefined). Using `z.object({ from: z.date().optional(), ... })` produces an incompatible TypeScript type (`from?:` vs `from:`). `z.custom` accepts the type directly without narrowing.
- **`buttonVariants + Link` instead of `Button asChild`:** `@base-ui/react/button` does not implement the Radix `asChild` / Slot pattern. Using `buttonVariants()` className on a Next.js `<Link>` achieves the same visual output.
- **`updateTrip` / `deleteTrip` included in trips.ts:** 02-05 will need them; adding stubs now under normal RLS avoids a separate diff to the same file. Both are clean plain-RLS actions (no service-role).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resolved Next.js route/page conflict at /trips/new**
- **Found during:** Task 3 (npm run build)
- **Issue:** Having both `src/app/trips/new/page.tsx` (GET) and `src/app/trips/new/route.ts` (POST) in the same directory causes a Next.js Turbopack build error: "Conflicting route and page at /trips/new"
- **Fix:** Moved the create page to `/trips/nueva` (Spanish "new"); updated the welcome screen link from `/trips/new` to `/trips/nueva`. The POST route handler remains at `/trips/new` (matching the form's `fetch('/trips/new', { method: 'POST' })` target — unchanged)
- **Files modified:** src/app/trips/nueva/page.tsx (new), src/app/page.tsx (link updated)
- **Verification:** `npm run build` exits 0; both routes appear in route manifest
- **Committed in:** 6576b7a (Task 3 commit)

**2. [Rule 1 - Bug] Fixed DateRange type mismatch in Zod schema**
- **Found during:** Task 2 TypeScript check
- **Issue:** `z.object({ from: z.date().optional(), to: z.date().optional() })` produces `{ from?: Date }` but `DateRange` from react-day-picker is `{ from: Date | undefined; to?: Date | undefined }` — the `from` field is required (present but possibly undefined) vs optional (may be absent). TypeScript reports TS2322 on the Calendar's `selected` prop
- **Fix:** Replaced the nested z.object with `z.custom<DateRange | undefined>()` which accepts the exact type
- **Files modified:** src/components/trip/CreateTripForm.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 9c6b698 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correct TypeScript types and working builds. No scope creep.

## Known Stubs

- `updateTrip` and `deleteTrip` in `src/actions/trips.ts` are functional stubs for 02-05. They have correct RLS-based logic but are not yet wired to any UI surface.

## Threat Flags

None — all surfaces match the plan's threat model:
- T-02-02 (spoofing `created_by`): mitigated — identity exclusively from `getUser()`/`signInAnonymously()`, body supplies only name/dates/description
- T-02-03 (SUPABASE_SECRET_KEY disclosure): mitigated — key read only in `'use server'` file, never `NEXT_PUBLIC_*`
- T-02-04 (service-role scope creep): mitigated — service-role used only for two bounded inserts in createTrip; updateTrip/deleteTrip use normal RLS
- T-02-06 (input validation): mitigated — Zod schema on form + server-side name length check in route handler

## Self-Check: PASSED

All 6 files present. All 3 task commits in git history.
- src/actions/trips.ts — FOUND
- src/app/trips/new/route.ts — FOUND
- src/components/trip/CreateTripForm.tsx — FOUND
- src/components/trip/TripDatePicker.tsx — FOUND
- src/app/trips/nueva/page.tsx — FOUND
- src/app/page.tsx (modified) — FOUND
- Commits: 8b9f3f5, 9c6b698, 6576b7a — all FOUND

`npm test`: 73/73 passing
`npx tsc --noEmit`: exits 0
`npm run build`: exits 0
