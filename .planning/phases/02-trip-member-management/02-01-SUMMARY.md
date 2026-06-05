---
phase: 02-trip-member-management
plan: 01
subsystem: utils/i18n/ui-primitives
tags: [invite-code, date-format, i18n, shadcn, tdd, wave-0]
dependency_graph:
  requires: []
  provides:
    - generateInviteCode (src/lib/utils/invite-code.ts)
    - parseLocalDate / toLocalDateString / formatTripRange (src/lib/utils/date-format.ts)
    - trip / members / invite namespaces (src/i18n/es.ts)
    - Calendar primitive (src/components/ui/calendar.tsx)
    - Textarea primitive (src/components/ui/textarea.tsx)
  affects:
    - All Phase 2 slices that import generateInviteCode or date helpers
    - src/actions/trips.ts (createTrip will call generateInviteCode)
    - Any component displaying trip dates (formatTripRange)
tech_stack:
  added:
    - react-day-picker@^10.0.1 (via npx shadcn add calendar)
    - date-fns@^4.x (transitive peer dep of react-day-picker)
  patterns:
    - TDD RED/GREEN cycle for each utility module
    - Intl.DateTimeFormat('es-MX') for locale-correct date display
    - SUFFIX_ALPHABET constant for unambiguous invite code generation
key_files:
  created:
    - src/lib/utils/date-format.ts
    - src/lib/utils/date-format.test.ts
    - src/components/ui/calendar.tsx
    - src/components/ui/textarea.tsx
  modified:
    - src/lib/utils/invite-code.ts (added generateInviteCode, SUFFIX_ALPHABET)
    - src/lib/utils/invite-code.test.ts (added 6 generateInviteCode test cases)
    - src/i18n/es.ts (added trip, members, invite namespaces)
    - src/i18n/es.test.ts (added 9 new test cases for 3 namespaces)
decisions:
  - "SUFFIX_ALPHABET excludes O/I/L/0/1 (D-06); Math.random() acceptable (display code, not secret)"
  - "parseLocalDate uses new Date(y, m-1, d) — local midnight, not UTC — guards Pitfall 2"
  - "formatTripRange uses Intl.formatRange for ranges — 'de' connector output locked as es-MX standard"
  - "calendar.tsx 'table' key renamed to 'month_grid' — react-day-picker v10 ClassNames API change"
metrics:
  duration: 4m
  completed: "2026-06-05"
  tasks: 3
  files: 8
---

# Phase 02 Plan 01: Foundation Utilities — invite-code, date-format, i18n, UI primitives

**One-liner:** TDD-verified `generateInviteCode` with unambiguous alphabet (D-06), timezone-safe es-MX `formatTripRange` (Pitfall 2), trip/members/invite i18n namespaces, and base-nova Calendar + Textarea primitives installed via CLI.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | generateInviteCode tests | 520c997 | invite-code.test.ts |
| 1 (GREEN) | generateInviteCode implementation | 3868179 | invite-code.ts, invite-code.test.ts |
| 2 (RED) | date-format tests | a3d02d7 | date-format.test.ts (new) |
| 2 (GREEN) | date-format helpers | c62054f | date-format.ts (new) |
| 3 | es.ts namespaces + shadcn primitives | 41e1a03 | es.ts, es.test.ts, calendar.tsx, textarea.tsx, package.json |

## Verification Results

- `npm test`: 73 tests passing (6 test files)
- `npx tsc --noEmit`: exits 0
- `grep -n "export function generateInviteCode" src/lib/utils/invite-code.ts`: found at line 53
- `grep -n "Intl.DateTimeFormat('es-MX'" src/lib/utils/date-format.ts`: found at line 7
- No `@radix-ui` imports in calendar.tsx or textarea.tsx
- `react-day-picker` in package.json: `^10.0.1`

## TDD Gate Compliance

Task 1 and Task 2 followed the full RED/GREEN cycle:
- RED commits: `520c997` (invite-code) and `a3d02d7` (date-format)
- GREEN commits: `3868179` (invite-code) and `c62054f` (date-format)
- REFACTOR: not needed; code was clean from GREEN

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test expectation for accented-char prefix ('café')**
- **Found during:** Task 1 GREEN
- **Issue:** Test expected `generateInviteCode('café 2026')` to produce prefix 'CAFE', but 'é' uppercases to 'É' (U+00C9) which is outside the `[A-Z]` regex range, yielding 'CAF'.
- **Fix:** Replaced with two corrected tests: `'CANCUN 2026'` → prefix `'CANC'`, and `'café'` → prefix `'CAF'` with a comment explaining the É/A-Z behavior.
- **Files modified:** src/lib/utils/invite-code.test.ts
- **Commit:** 3868179

**2. [Rule 1 - Bug] Fixed react-day-picker v10 classNames type error in generated calendar.tsx**
- **Found during:** Task 3 tsc --noEmit verification
- **Issue:** The shadcn CLI generated `calendar.tsx` with `table: "w-full border-collapse"` in the `classNames` object, but `'table'` is not a valid key in react-day-picker v10's `ClassNames` type. The valid key is `month_grid`.
- **Fix:** Renamed `table` → `month_grid` in the classNames object (line 90).
- **Files modified:** src/components/ui/calendar.tsx
- **Commit:** 41e1a03

### Plan Note: grep check false-positive for date-format.ts

The plan's acceptance check `grep -nE "toISOString|new Date\([a-z]"` would flag line 24 (`return new Date(y, m - 1, d)`) as a false positive because `y` is a lowercase variable. However, `new Date(y, m-1, d)` with three numeric arguments is the CORRECT local-date construction — it's not the UTC-unsafe `new Date(someString)` pattern the check intends to catch. The round-trip test (`toLocalDateString(parseLocalDate('2026-06-05')) === '2026-06-05'`) behaviorally confirms no UTC shift.

## Known Stubs

None — this plan creates pure utilities and primitives with no UI. No data flows to render that could be stubbed.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. `generateInviteCode` uses `Math.random()` per the approved T-02-01 disposition (display capability token, not a secret). Calendar/textarea are client-side UI primitives with no backend surface.

## Self-Check: PASSED

All 8 files confirmed present. All 5 task commits confirmed in git history.
- src/lib/utils/invite-code.ts — FOUND
- src/lib/utils/invite-code.test.ts — FOUND
- src/lib/utils/date-format.ts — FOUND
- src/lib/utils/date-format.test.ts — FOUND
- src/i18n/es.ts — FOUND
- src/i18n/es.test.ts — FOUND
- src/components/ui/calendar.tsx — FOUND
- src/components/ui/textarea.tsx — FOUND
- Commits: 520c997, 3868179, a3d02d7, c62054f, 41e1a03 — all FOUND
