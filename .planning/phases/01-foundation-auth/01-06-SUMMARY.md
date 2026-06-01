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

## 🔬 Corrected root cause — Gap 2 was FOUR layers, not one

The original debug diagnosis (RLS chicken-and-egg on `trips` SELECT → PGRST116) was tested by
calling `joinTrip()` directly, which bypassed the page's own guards. End-to-end testing of the
real `/join/{token}` flow (dev server + curl, against live `vumiszpfiftmvyrfyixf`) revealed that
the SELECT issue was only the first of four blockers. All four are now fixed (commit `2be3ce3`,
verified locally: `/join/{seed-token}` → anon sign-in → `/t/{id}/docs` HTTP 200):

1. **Trips SELECT (RPC)** — the original fix. `get_trip_id_by_invite_token` SECURITY DEFINER RPC. ✅ applied live via SQL Editor.
2. **Zod v4 `.uuid()` rejected the seed token** — `22222222-…` is not RFC4122 (bad version/variant nibbles), so validation failed *before* `joinTrip` ran → `invalidJoinToken`. Loosened to a uuid-FORMAT regex (matches what the Postgres `uuid` column accepts). Real `gen_random_uuid()` tokens and the seed both pass.
3. **`/join` was a Server Component** — `signInAnonymously()` must write the session cookie, forbidden during render → 500. Converted `page.tsx` → `route.ts` (Route Handler), mirroring `/auth/callback`.
4. **`trip_members` INSERT ran unauthenticated** — after `signInAnonymously` the new session is only on the response cookie, so the next in-request supabase call (`@supabase/ssr` and an access-token client both) didn't carry it → `auth.uid()` null → `WITH CHECK (user_id = auth.uid())` violation, silently swallowed → user never became a member → `/t` bounced to `/`. Now the membership insert uses the **service-role client** (server-only key, server-supplied `userId`, trip resolved from a valid token) and a failed insert is fatal.

## Deploy chain discovered (also fixed this session)

The deployed app was running stale code/config. Resolved during this session:
- 6 local commits were unpushed → `git push origin main`.
- Vercel was NOT auto-deploying on push → deployed manually with `vercel --prod --force`.
- Production env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were re-set from `.env.local` (they read back empty via `vercel env pull`).

## ⚠️ Outstanding before Test 5 passes on the live device

- **`get_trip_id_by_invite_token` migration:** ✅ applied live (SQL Editor, confirmed returning the seed trip id).
- **Deploy the new code** (commit `2be3ce3`): `git push origin main` then `vercel --prod --force`.
- **`SUPABASE_SECRET_KEY` in Vercel Production must be correct** — the membership insert now depends on it. Re-set it from `.env.local` (same as the other two) before/with the deploy, or the insert will fail in prod.
- Then re-test on iPhone: `https://sharedtrip.vercel.app/join/22222222-2222-2222-2222-222222222222` → lands inside the trip (Documentos), no error. Unblocks Tests 6–11.
