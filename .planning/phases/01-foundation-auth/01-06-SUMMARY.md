---
phase: 01-foundation-auth
plan: 06
subsystem: auth
tags: [supabase, rls, security-definer, postgres, anonymous-auth, rpc]

requires:
  - phase: 01-foundation-auth (plan 02)
    provides: trips table, invite_token column, is_trip_member() pattern, seed test trip
  - phase: 01-foundation-auth (plan 05)
    provides: joinTrip() anonymous-join server action
provides:
  - SECURITY DEFINER fn get_trip_id_by_invite_token(uuid) — controlled bypass for token→id resolution
  - joinTrip() resolves the trip id via RPC instead of a membership-gated trips.select
affects: [anonymous-join, uat-test-5, uat-tests-6-11]

tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER token-resolution RPC as the controlled bypass for the membership-gated trips SELECT policy"

key-files:
  created:
    - supabase/migrations/20260530000005_invite_token_lookup_fn.sql
  modified:
    - src/actions/members.ts
    - src/types/database.ts

key-decisions:
  - "Resolve the chicken-and-egg with a SECURITY DEFINER RPC returning ONLY the trip id, rather than relaxing the trips SELECT RLS policy — the membership gate on trip content stays verbatim."
  - "Manually added get_trip_id_by_invite_token to src/types/database.ts because the generated types predate the migration and no Supabase CLI / live regen is available in this environment."

patterns-established:
  - "Token-capability lookups that must run pre-membership go through a narrowly-scoped SECURITY DEFINER fn (mirrors is_trip_member: LANGUAGE sql, STABLE, SET search_path = public)."

requirements-completed: [AUTH-05]

duration: ~10min
completed: 2026-06-01
---

# Phase 01 · Plan 06 Summary

**Anonymous-join token resolution restored: a non-member anon user can now resolve a trip from a valid invite_token via a SECURITY DEFINER RPC, without relaxing the membership-gated trips SELECT policy.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-06-01
- **Tasks:** 2/2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **Task 1** — New migration `20260530000005_invite_token_lookup_fn.sql` adds `public.get_trip_id_by_invite_token(lookup_token uuid) RETURNS uuid` (LANGUAGE sql, SECURITY DEFINER, STABLE, `SET search_path = public`), mirroring the existing `is_trip_member` hardening. EXECUTE granted to `anon` and `authenticated`. No RLS policy added or altered.
- **Task 2** — `joinTrip()` now resolves the trip id with `supabase.rpc('get_trip_id_by_invite_token', { lookup_token: token })`; the direct `trips.select('id').eq('invite_token', …).single()` is gone. Unknown/invalid tokens still return `es.errors.invalidJoinToken`. Steps 1 (signInAnonymously) and 3 (trip_members upsert) unchanged.

## Verification

- `test -f` migration + `grep` SECURITY DEFINER / `SET search_path = public` / GRANT EXECUTE → **PASS**
- `grep rpc('get_trip_id_by_invite_token'` present, no `from('trips')`, `es.errors.invalidJoinToken` present → **PASS**
- `npx tsc --noEmit` → **PASS**

## Deviations

- **Added `src/types/database.ts`** (not in the plan's `files_modified`). The generated `Database` type predates migration 0005, so `supabase.rpc('get_trip_id_by_invite_token', …)` failed type-checking (the name resolved against `is_trip_member`). Added a one-line `Functions` entry `get_trip_id_by_invite_token: { Args: { lookup_token: string }; Returns: string }`. The canonical fix is to regenerate types after the migration is applied live (`supabase gen types`), which should reproduce this entry.

## ⚠️ Outstanding — LIVE APPLY REQUIRED (blocks UAT re-test)

The repo change is complete and committed, **but the migration is NOT yet applied to the live Supabase project** (`vumiszpfiftmvyrfyixf`). No Supabase CLI or Management API token is available in this environment, so it could not be pushed automatically.

To close UAT Gap 2 (Test 5) on the live app, the function must exist in production. Apply it by **one** of:
- Supabase Dashboard → SQL Editor → paste the contents of `supabase/migrations/20260530000005_invite_token_lookup_fn.sql` and run; **or**
- `supabase db push` once the CLI is installed and the project is linked.

Then re-run UAT Test 5: open `https://sharedtrip.vercel.app/join/22222222-2222-2222-2222-222222222222` in a fresh/private browser → expect anonymous sign-in landing on the Documentos tab, no "ese link de invitación está mal" error. Passing this unblocks Tests 6–11.
