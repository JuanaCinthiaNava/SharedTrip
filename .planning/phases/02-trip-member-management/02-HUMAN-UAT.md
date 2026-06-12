---
status: diagnosed
phase: 02-trip-member-management
source: [02-VERIFICATION.md]
started: 2026-06-05T20:45:00Z
updated: 2026-06-12T21:30:00Z
---

## Current Test

[testing complete]

<!--
Re-test run started 2026-06-12. The prior run (same day) marked all 6 tests blocked:
Phase 02 code was committed locally but unpushed (origin/main frozen at 32ee7a5,
2026-06-01) so prod ran pre-Phase-02 code. Resolved by pushing 57 commits + redeploying
prod (vercel --prod --force, dpl_3nEnLTBJ8nf8R9ZYLhnWnH3YpQpp). 3 untracked magic-link
zombie files were deleted to fix the build. Now re-testing against deployed code.
-->

## Tests

### 1. Trip dates render on screen in es-MX format (SC5 / UI-05)
expected: On a trip with dates set, the Gente page trip header shows the range via `formatTripRange` (e.g. "5–12 de jun de 2026"); a trip with no dates shows no date row.
result: pass

### 2. Anonymous trip creation works end-to-end on a fresh device
expected: A user with no prior session opens `/`, taps "Crear viaje", fills a trip name (dates/description optional), and lands inside `/t/[id]/gente` as the trip admin with a generated invite code visible on the InviteCard.
result: pass

### 3. Clipboard copy of invitation produces the correct message
expected: Tapping "Copiar invitación" on the InviteCard shows a "Copiado" toast and copies a message containing the `/join/[code]` deep-link AND the bare code.
result: pass

### 4. Edit trip changes are visible to another member on next navigation
expected: Creator edits the trip name (EditTripSheet); another member in a different session navigates to the Gente tab and sees the new name/dates without a hard reload (revalidatePath + router.refresh).
result: pass

### 5. Creator removes a member; member can leave; removed/left member is bounced
expected: Creator taps "Quitar" on another member's row and confirms → row disappears. A non-creator taps "Salir del viaje" and confirms → returns to `/`. A removed/left member navigating to any `/t/[tripId]/*` route is redirected to `/` by the layout null-trip guard. The creator has no "Salir" (delete is their only exit).
result: issue
reported: "no veo ningun miembro aunque alguien ya abrió el link para ver el viaje"
severity: major

### 6. Delete trip requires typing the exact name
expected: Creator opens the delete dialog; the destructive "Eliminar viaje" button stays disabled until the exact trip name is typed; confirming deletes the trip (cascade) and returns to `/`.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "The Gente member list shows every member of the trip, including others who joined via the invite link — not just the current user."
  status: failed
  reason: "User reported: no veo ningún miembro aunque alguien ya abrió el link para ver el viaje. After someone opened the invite link, the creator still sees no member rows. Either the join did not create a trip_members row, or the Gente member-list query (likely RLS) only returns the current user. Blocks the remove-member sub-test (no row to 'Quitar')."
  severity: major
  test: 5
  root_cause: "CONFIRMED via prod inspection (2026-06-12). The join is NOT broken — trip 'COSTA AMALFI' (COST-8AC9) has 2 trip_members rows in prod (admin 0184346a + member f5a5848e), so joinTripByCode correctly created the membership. The bug is in the Gente member-list READ: gente/page.tsx runs `supabase.from('trip_members').select('user_id, role, profiles(display_name, avatar_seed)')` — a PostgREST embed that requires a FK relationship between trip_members and profiles. NO such FK exists: trip_members.user_id REFERENCES auth.users (initial_schema.sql:45) and profiles.id REFERENCES auth.users (line 18), but there is no direct trip_members→profiles FK. PostgREST returns error PGRST200 ('Could not find a relationship between trip_members and profiles in the schema cache'). The code discards the error (`const { data: rawMembers }` — error not checked), falls back to `rawMembers ?? []` → [] → hasCoMembers=false → MemberList never renders. This fails for EVERY trip, not just COSTA AMALFI, and a refresh can never fix it (not a cache issue). Secondary defect: the swallowed query error hid this for the whole phase. NOTE: the earlier 'NYC-JKSX no es válido' report is unrelated and working-as-designed (that code does not exist in prod)."
  artifacts:
    - path: "src/app/t/[tripId]/gente/page.tsx"
      issue: "Lines 44-48: trip_members SELECT with embedded `profiles(display_name, avatar_seed)` fails with PGRST200 — no FK between trip_members and profiles for PostgREST to resolve. Error is discarded (data destructured without error), silently yielding an empty member list for all trips."
    - path: "supabase/migrations/20260530000001_initial_schema.sql"
      issue: "Lines 18 & 45: profiles.id and trip_members.user_id both FK to auth.users but there is no direct FK from trip_members.user_id to profiles.id, so PostgREST cannot embed profiles on trip_members."
  missing:
    - "Add a FK so PostgREST can resolve the embed: new migration `ALTER TABLE public.trip_members ADD CONSTRAINT trip_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;` (profiles.id is 1:1 with auth.users.id; every member already has a profile row). Then `profiles(...)` embed resolves. — OR — rewrite gente/page.tsx to fetch trip_members and profiles in two queries and join in JS (no migration)."
    - "Stop swallowing the query error in gente/page.tsx — check `error` and log/surface it so a broken member query can never again silently render an empty list."
    - "After fix, redeploy prod (git push + vercel --prod --force) and re-verify Test 5 on COSTA AMALFI (member f5a5848e should appear)."
  resolution: "RESOLVED 2026-06-12. Migration 20260530000007 adds the trip_members.user_id -> profiles.id FK; applied to prod via Supabase SQL editor. gente/page.tsx now checks the query error instead of discarding it (commit 0653d23). User confirmed the member list renders ('FUNCIONO')."
  debug_session: ""

- truth: "Typing an invite code on the welcome screen and tapping 'Entrar al viaje' takes the user into the trip (same outcome as opening the /join link)."
  status: failed
  reason: "User reported: the /join link works, but typing the code on / and submitting 'no hace nada' — the URL becomes /?code=XXX and nothing happens. Diagnosis: InviteCodeForm (<form noValidate> with input name='code', no action) navigates via client JS to /join/{code}. When that JS doesn't run (hydration hiccup / stale PWA service worker serving mismatched chunks / JS disabled), the browser does a NATIVE GET submit to /?code=XXX. The welcome page ignored that param, so the submit dead-ended. Prod confirmed: /?code=TEST-AB12 returned HTTP 200 (welcome page), no redirect."
  severity: major
  test: 5
  root_cause: "Typed-code entry depended entirely on client JS; the native form-submit fallback (GET /?code=XXX) was not handled server-side. Not a join-flow bug — /join itself works (verified)."
  artifacts:
    - path: "src/app/page.tsx"
      issue: "WelcomePage did not read the ?code= search param, so a native form submission (when client JS didn't run) dead-ended on the welcome screen."
  missing:
    - "Progressive enhancement: read ?code= in WelcomePage and redirect a well-formed code to /join/{code} server-side, so typed-code entry works with or without JS."
  resolution: "RESOLVED 2026-06-12. WelcomePage now reads searchParams.code and redirects a well-formed code to /join/{normalized} (commit 0f8337e). Pushed + deployed to prod (dpl_51MjBE4...). Verified: /?code=TEST-AB12 -> 307 /join/TEST-AB12 (case-insensitive). Awaiting final on-device confirmation by user."
  debug_session: ""
