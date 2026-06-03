---
phase: 01-foundation-auth
plan: 08
subsystem: database
tags: [postgres, supabase, migrations, rpc, security-definer, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-auth plan 06
    provides: get_trip_id_by_invite_token SECURITY DEFINER pattern (mirrored exactly for text resolver)
  - phase: 01-foundation-auth plan 02
    provides: trips table schema and seed migration 000004

provides:
  - trips.invite_code text NOT NULL UNIQUE (normalized uppercase) column
  - get_trip_id_by_invite_code(lookup_code text) RETURNS uuid — case-insensitive SECURITY DEFINER resolver
  - Seed trip 11111111-... resolvable from typed code 'TEST-AB12'
  - Updated database types: trips Row/Insert/Update + Functions block includes invite_code + RPC
affects:
  - 01-09 (entry-UI slice — joinTripByCode calls supabase.rpc('get_trip_id_by_invite_code', { lookup_code }))
  - 02 (trip creation must generate and store invite_code; retry on UNIQUE violation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER text resolver: same pattern as get_trip_id_by_invite_token but for text + upper(trim()) normalization, grants to anon+authenticated, SET search_path = public"
    - "Nullable-column ADD then backfill then SET NOT NULL + UNIQUE — safe migration sequence for adding a NOT NULL column to a table with existing rows"

key-files:
  created:
    - supabase/migrations/20260530000006_invite_code.sql
  modified:
    - supabase/migrations/20260530000004_phase1_seed_test_trip.sql
    - src/types/database.ts

key-decisions:
  - "trips.invite_code added alongside vestigial invite_token — invite_token NOT dropped to avoid editing shipped migrations 000001/000005; cost is zero, regression risk is real"
  - "Resolver normalizes via upper(trim(lookup_code)) — codes stored uppercase, input trimmed so trailing spaces from mobile keyboards resolve correctly"
  - "Live migration applied manually via Supabase Dashboard SQL Editor (not supabase db push) — human checkpoint confirmed 4 verification queries passed"

patterns-established:
  - "Invite-code resolution pattern: supabase.rpc('get_trip_id_by_invite_code', { lookup_code: userInput }) returns trip_id | null — null maps to invalidJoinToken error, never expose oracle distinguishing 'wrong format' from 'valid format, no trip'"

requirements-completed:
  - AUTH-05

# Metrics
duration: 30min (automated) + human-action checkpoint
completed: 2026-06-03
---

# Phase 01 Plan 08: Invite Code Data Layer Summary

**trips.invite_code (NOT NULL UNIQUE) column + get_trip_id_by_invite_code(text) SECURITY DEFINER resolver applied live; seed trip TEST-AB12 resolves case-insensitively; TypeScript types updated**

## Performance

- **Duration:** ~30 min automated execution + human-action checkpoint (live migration apply)
- **Started:** 2026-06-02
- **Completed:** 2026-06-03
- **Tasks:** 3 (2 automated + 1 human-action checkpoint)
- **Files modified:** 3

## Accomplishments

- New migration 20260530000006_invite_code.sql: adds `trips.invite_code text NOT NULL UNIQUE` (nullable-first, backfill, then constraint) and `get_trip_id_by_invite_code(lookup_code text)` SECURITY DEFINER resolver mirroring the 000005 token resolver — normalizes via `upper(trim())`, grants to `anon` + `authenticated`
- Seed trip (11111111-...) now carries `invite_code = 'TEST-AB12'` via idempotent INSERT column + post-insert UPDATE in migration 000004, making it resolvable on both fresh and existing databases
- `src/types/database.ts` updated by hand: `invite_code: string` in trips `Row`; `invite_code?: string` in `Insert`/`Update`; `get_trip_id_by_invite_code: { Args: { lookup_code: string }; Returns: string }` in `Functions` — all alongside retained `invite_token` entries; `npx tsc --noEmit` passes
- Live Supabase project: human applied migration via Dashboard SQL Editor — all 4 verification queries confirmed: seed row = TEST-AB12, `get_trip_id_by_invite_code('test-ab12 ')` → seed trip UUID, unknown code → NULL, `trips_invite_code_key` UNIQUE constraint present
- No RLS policy added or altered; `invite_token` column and `get_trip_id_by_invite_token` resolver retained untouched

## Task Commits

1. **Task 1: add invite_code column + get_trip_id_by_invite_code resolver** — `c9308b5` (feat)
2. **Task 2: seed trip invite_code TEST-AB12 + update database types** — `6a402fa` (feat)
3. **Task 3: checkpoint — live migration applied by human** — (no code commit; human action confirmed)
4. **State checkpoint doc** — `3de44fc` (docs — recorded blocker in STATE.md before human applied migration)

## Files Created/Modified

- `supabase/migrations/20260530000006_invite_code.sql` — Adds `trips.invite_code` column (nullable → backfill → NOT NULL UNIQUE) and `get_trip_id_by_invite_code(text)` SECURITY DEFINER resolver
- `supabase/migrations/20260530000004_phase1_seed_test_trip.sql` — trips INSERT extended with `invite_code = 'TEST-AB12'`; idempotent UPDATE added for existing rows
- `src/types/database.ts` — trips Row/Insert/Update each declare `invite_code`; Functions block declares `get_trip_id_by_invite_code` alongside retained `get_trip_id_by_invite_token`

## Decisions Made

**Retain invite_token:** `trips.invite_token uuid NOT NULL DEFAULT gen_random_uuid()` and its resolver `get_trip_id_by_invite_token` are kept in place. Dropping them would require editing shipped migrations 000001 and 000005, risking regression on the verified anon-join chain. The vestigial column costs nothing at v1 scale; it can be formally retired in a later cleanup. invite_code is the v1 entry mechanism.

**Resolver normalization:** `upper(trim(lookup_code))` normalizes both case and trailing whitespace. Codes are stored uppercase; input is trimmed so mobile keyboards typing extra spaces do not cause a miss.

**Live migration via Dashboard (not supabase db push):** The human used Supabase Dashboard SQL Editor to apply the migration SQL and the seed UPDATE directly. All 4 verification queries confirmed success before checkpoint was cleared.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None in automated tasks. The human-action checkpoint (task 3) proceeded as designed: the human applied the migration and seed UPDATE to the live Supabase project via Dashboard SQL Editor, confirmed the 4 verification queries, and returned "approved". No unexpected failures.

## Live Migration Confirmation

Applied by human on 2026-06-03 via Supabase Dashboard SQL Editor. Verification results confirmed:

1. `SELECT invite_code FROM public.trips WHERE id = '11111111-1111-1111-1111-111111111111'` → `TEST-AB12`
2. `SELECT public.get_trip_id_by_invite_code('test-ab12 ')` (lowercase + trailing space) → `11111111-1111-1111-1111-111111111111`
3. `SELECT public.get_trip_id_by_invite_code('NOPE-9999')` → NULL (empty result, no error)
4. `SELECT conname FROM pg_constraint WHERE conname = 'trips_invite_code_key'` → `trips_invite_code_key`

## trips Type Block (for Plan 01-09 reference)

Final shape in `src/types/database.ts`:

```typescript
// trips Row
invite_token: string
invite_code: string

// trips Insert
invite_token?: string
invite_code?: string

// trips Update
invite_token?: string
invite_code?: string

// Functions
get_trip_id_by_invite_token: { Args: { lookup_token: string }; Returns: string }
get_trip_id_by_invite_code: { Args: { lookup_code: string }; Returns: string }
```

## User Setup Required

None — migration was applied by the human as the human-action checkpoint.

## Next Phase Readiness

Plan 01-09 is now unblocked. It can:
- Call `supabase.rpc('get_trip_id_by_invite_code', { lookup_code: userInput })` typed against the updated `src/types/database.ts`
- Map a `null` return to an `invalidJoinToken` error (no oracle — do not distinguish "wrong format" from "valid format, no trip" per T-01-08-03)
- Render a typed invite-code entry form with `TEST-AB12` as the acceptance test code

**Brute-force note for 01-09 (T-01-08-03):** The resolver does not rate-limit. Plan 01-09 must not echo whether a code maps to a real trip beyond the generic `invalidJoinToken` path. Phase 5 may add per-IP rate limiting if abuse appears.

---

*Phase: 01-foundation-auth*
*Completed: 2026-06-03*
