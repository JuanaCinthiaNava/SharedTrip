---
phase: 01-foundation-auth
verified: 2026-06-03T20:00:00Z
status: passed
human_verification_completed: 2026-06-02
human_verification_result: "11/11 UAT items passed on real iPhone + Supabase Dashboard (approved); 2 UAT-driven fixes applied — cccf9c1, e30b3bc"
score: 13/13 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 14/16
  gaps_closed:
    - "Magic-link path removed (AUTH-01/02 deferred to Phase 6 per re-scope)"
    - "Plan 08: trips.invite_code (NOT NULL UNIQUE) + get_trip_id_by_invite_code SECURITY DEFINER resolver added and applied LIVE (4/4 SQL verification queries confirmed)"
    - "Plan 09: joinTripByCode server action, /join/[code] route handler, InviteCodeForm — full typed-code entry path implemented and wired"
    - "All magic-link code deleted: sendMagicLink, MagicLinkForm.tsx, /auth/callback, /auth/check-email — no dangling imports"
    - "D-12 email-upgrade banner unwired (AnonymousBanner removed from trip layout); D-11 SinCuentaPill made static non-interactive indicator"
    - "50/50 tests pass; npm run build exits 0; tsc --noEmit exits 0"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Deploy to production and verify code-entry welcome screen renders on real iPhone"
    expected: "vercel --prod --force succeeds; https://sharedtrip.vercel.app/ shows the es.entry.heading ('Ingresa tu código de viaje') and an invite-CODE input (not email field) with 'Entrar al viaje' button"
    why_human: "Production does not auto-deploy on push (see vercel-deploy-workflow memory); deploy command requires Vercel auth"
  - test: "Typed-code happy path end-to-end on real iPhone (re-scoped AUTH-05)"
    expected: "Type 'test-ab12' (lowercase, optional trailing space) on /; tap 'Entrar al viaje'; lands at /t/11111111-.../docs within ~2s with no email, no login prompt, no upgrade banner; top header shows trip name and mango 'Sin cuenta' pill"
    why_human: "Requires live Supabase with Anonymous Sign-ins enabled, live seed trip TEST-AB12, and a real device to observe the join flow and UI"
  - test: "Membership row created in DB (re-scoped AUTH-05 step 2)"
    expected: "After typed-code join, Supabase Dashboard SQL: SELECT user_id, role FROM public.trip_members WHERE trip_id='11111111-1111-1111-1111-111111111111' ORDER BY joined_at DESC LIMIT 5 shows new row with anonymous user_id and role='member'"
    why_human: "Requires live anonymous sign-in against real Supabase project to verify the DB mutation"
  - test: "Pill is inert (D-11 static indicator)"
    expected: "Tapping 'Sin cuenta' pill does nothing — no upgrade sheet, no state change"
    why_human: "Requires real device to confirm the <span> has no tap behavior"
  - test: "Session persists across browser restarts (AUTH-03)"
    expected: "Force-quit Safari, reopen, navigate to /t/11111111-.../docs — still inside trip (not bounced to /)"
    why_human: "Cookie persistence can only be confirmed on a real device; programmatic checks cannot simulate Safari force-quit"
  - test: "Sign out returns to code-entry welcome screen (AUTH-04)"
    expected: "Perfil -> Cerrar sesión -> confirm -> arrives at / showing the InviteCodeForm (not email field)"
    why_human: "Requires real device and live session"
  - test: "Unknown code error path"
    expected: "Type 'NOPE-9999', tap submit, redirected back to / with Spanish toast 'Este link de invitación no es válido…' (es.errors.invalidJoinToken); no membership created"
    why_human: "Requires live Supabase to confirm NULL resolution from the RPC and correct toast behavior"
  - test: "Malformed code inline validation (no network round-trip)"
    expected: "Type 'hello' (no hyphen), tap submit — inline Spanish format error (es.entry.invalidFormat: 'Revisa el código: formato como EJEM-AB12.') shown under field; no navigation, no network call"
    why_human: "Client-side Zod validation behavior can be observed only in a real browser"
  - test: "Code-in-URL fallback (/join/[code] route)"
    expected: "Navigate directly to https://{domain}/join/test-ab12 — same result as typed-code happy path"
    why_human: "Requires live deployed app and device to verify the GET route handler + redirect"
  - test: "GitHub Actions keep-alive manual run (INFRA-05)"
    expected: "gh workflow run keep-alive.yml returns success; curl log shows HTTP 200 from Supabase REST endpoint"
    why_human: "Requires GitHub authentication and live workflow execution"
  - test: "Production manifest.webmanifest returns valid JSON after redeploy (PWA groundwork)"
    expected: "GET https://sharedtrip.vercel.app/manifest.webmanifest returns HTTP 200, Content-Type: application/manifest+json, JSON has name 'SharedTrip', lang 'es', display 'standalone'"
    why_human: "Requires a prod redeploy to be confirmed; stale deployments serve 404"
---

# Phase 1: Foundation + Auth — Verification Report (Re-verification after Plans 08+09 re-scope)

**Phase Goal:** Any user — including a friend with no account — can open the app on a real iPhone, join a trip by TYPING a short invite code (e.g. `MARR-4F9K` / seed `TEST-AB12`), set a display name, and hold an anonymous session that persists across browser restarts.
**Verified:** 2026-06-03T20:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after Plans 08+09 re-scope implementation (typed invite-code entry replaces magic-link)

---

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Developer deploys to Vercel and app loads on a real iPhone via HTTPS with valid domain | VERIFIED | `https://sharedtrip.vercel.app` confirmed live (HTTP 200, `lang="es"`) from previous verification; prod deploy of Plans 08+09 pending human action |
| SC-2 | A person opens the app, types a short invite code (no email, no login), gets an anonymous Supabase session, sees themselves as a member, and sets a display name | VERIFIED (code) / HUMAN (runtime) | `InviteCodeForm` -> `/join/[code]` route -> `joinTripByCode` -> `get_trip_id_by_invite_code` RPC -> service-role upsert: full end-to-end code path wired. Data layer live (Plan 08 confirmed by human). Real-device run pending. |
| SC-3 | The anonymous session persists across browser restarts; user can sign out from any screen | VERIFIED (code) / HUMAN (runtime) | `@supabase/ssr` cookie-based session; middleware calls `getUser()` on every request; `signOut` server action wired to Perfil tab. Real-device persistence test pending. |
| SC-4 | A GitHub Actions cron pings Supabase; all UI strings from `es.ts` with no hardcoded English | VERIFIED | `*/5 * * * *` cron confirmed in `keep-alive.yml`; zero English user-facing strings in component JSX (all via `es.entry.*`, `es.errors.*`, `es.anon.*`, `es.tabs.*`, etc.) |

**Score:** 13/13 individual must-haves verified in code (see detail tables below)

---

### Required Artifacts (Plans 08+09 — New Must-Haves)

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/20260530000006_invite_code.sql` | VERIFIED | `ADD COLUMN invite_code text`; backfill; `SET NOT NULL`; `UNIQUE` constraint `trips_invite_code_key`; `get_trip_id_by_invite_code(lookup_code text)` SECURITY DEFINER STABLE `SET search_path = public` with `upper(trim(lookup_code))`; `GRANT EXECUTE ... TO anon, authenticated`; no RLS policy touched |
| `supabase/migrations/20260530000004_phase1_seed_test_trip.sql` | VERIFIED | trips INSERT extended with `invite_code = 'TEST-AB12'`; idempotent UPDATE present (`WHERE invite_code IS DISTINCT FROM 'TEST-AB12'`) |
| `src/types/database.ts` | VERIFIED | `invite_code: string` in trips `Row`; `invite_code?: string` in `Insert`/`Update`; `get_trip_id_by_invite_code: { Args: { lookup_code: string }; Returns: string }` in `Functions` block; `invite_token` retained |
| `src/actions/members.ts` | VERIFIED | `'use server'`; exports `joinTripByCode`; step 2 calls `supabase.rpc('get_trip_id_by_invite_code', { lookup_code: code })`; service-role `trip_members.upsert` with `onConflict: 'trip_id,user_id'` verbatim from anon-join-architecture; no redirect; errors via `es.errors.*` only |
| `src/components/auth/InviteCodeForm.tsx` | VERIFIED | `'use client'`; `useForm` + `zodResolver`; `CODE_RE` imported from `@/lib/utils/invite-code`; validates on `onBlur`; normalizes `trim().toUpperCase()`; `router.push('/join/' + encodeURIComponent(normalized))`; spinner via `useTransition`; all strings via `es.entry.*` |
| `src/app/join/[code]/route.ts` | VERIFIED | GET route handler; `>32 char` length guard; calls `joinTripByCode(decoded)`; redirects to `/t/${result.tripId}/docs` on success; `/?error=...` on failure; no hardcoded Spanish |
| `src/app/page.tsx` | VERIFIED | Renders `InviteCodeForm` (not `MagicLinkForm`); heading/subheading use `es.entry.heading`/`es.entry.subheading`; `Wordmark` + `ErrorToast` retained |
| `src/i18n/es.ts` | VERIFIED | `entry:` namespace present with `heading`, `subheading`, `codeLabel`, `codePlaceholder`, `submitCta`, `invalidFormat` |
| `src/lib/utils/invite-code.ts` | VERIFIED | Exports `CODE_RE = /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/`; `normalizeInviteCode`; `isWellFormedInviteCode` |
| `src/actions/auth.ts` | VERIFIED | `sendMagicLink` removed; `signOut` retained intact; no dangling imports |
| `src/components/common/SinCuentaPill.tsx` | VERIFIED | `<span>` (not `<button>`); no `useBannerStore` import; no `openUpgradeSheet`; renders `es.anon.pill`; static non-interactive indicator |
| `src/components/layout/TopHeader.tsx` | VERIFIED | No `AnonymousUpgradeSheet` import or render; no `useBannerStore` wiring; `{isAnonymous && <SinCuentaPill />}` retained |
| `src/app/t/[tripId]/layout.tsx` | VERIFIED | No `AnonymousBanner` import or render; comment: "email-upgrade banner is intentionally not imported — deferred to Phase 6 (D-12)" |

**Deleted files confirmed absent:**

| File | Status |
|------|--------|
| `src/components/auth/MagicLinkForm.tsx` | DELETED |
| `src/app/auth/callback/route.ts` | DELETED (directory is empty) |
| `src/app/auth/check-email/page.tsx` | DELETED (directory is empty) |
| `src/app/join/[token]/route.ts` | DELETED |

---

### Key Link Verification (Plans 08+09 Critical Path)

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `InviteCodeForm.tsx` | `/join/[code]/route.ts` | `router.push('/join/' + encodeURIComponent(normalized))` | WIRED | `router.push` call confirmed in `onSubmit`; normalized code passed |
| `/join/[code]/route.ts` | `src/actions/members.ts` | `import { joinTripByCode }` + `await joinTripByCode(decoded)` | WIRED | Import and call both present in route handler |
| `src/actions/members.ts` | `get_trip_id_by_invite_code` (Postgres RPC) | `supabase.rpc('get_trip_id_by_invite_code', { lookup_code: code })` | WIRED | Exact call at line 68; typed against `src/types/database.ts` |
| `src/actions/members.ts` | `trip_members` (service-role insert) | `admin.from('trip_members').upsert(...)` | WIRED | Service-role client constructed with `SUPABASE_SECRET_KEY`; `onConflict: 'trip_id,user_id'` unchanged |
| `src/app/page.tsx` | `InviteCodeForm` | `import { InviteCodeForm }` + `<InviteCodeForm />` render | WIRED | No `MagicLinkForm` reference anywhere in `src/` |
| `supabase/migrations/...006_invite_code.sql` | Live Supabase project | Applied via Dashboard SQL Editor (human checkpoint Plan 08 Task 3) | WIRED (confirmed live) | 4/4 verification queries passed by human: seed row = TEST-AB12, case-insensitive resolution, NULL for unknown, UNIQUE constraint present |

---

### Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| INFRA-01 | 01-02 | Supabase project with DB, Auth, Storage, Realtime | SATISFIED | Live project confirmed; `.gsd-supabase-project.txt` present |
| INFRA-02 | 01-02 | Schema: 6 tables with correct columns and FK | SATISFIED | `20260530000001_initial_schema.sql` — 6 tables confirmed in prior verification |
| INFRA-03 | 01-02 | RLS on all tables; `is_trip_member` SECURITY DEFINER | SATISFIED | 6x ENABLE ROW LEVEL SECURITY; `is_trip_member` SECURITY DEFINER confirmed in prior verification |
| INFRA-04 | 01-02 | `trip-documents` bucket private + RLS policies | SATISFIED | `20260530000002_storage_bucket_rls.sql` confirmed in prior verification |
| INFRA-05 | 01-02 | GitHub Actions keep-alive cron every 5 min | SATISFIED | `*/5 * * * *` in `keep-alive.yml`; `workflow_dispatch` trigger present |
| INFRA-06 | 01-01 | Vercel deploy with functional domain + env vars | SATISFIED | `https://sharedtrip.vercel.app` live; prod redeploy of Plans 08+09 pending (human item) |
| INFRA-07 | 01-01/09 | `es.ts` dictionary — zero hardcoded user-facing English in JSX | SATISFIED | `es.entry.*` namespace added (Plan 09); no English in component files; stale comment in `ErrorToast.tsx` line 4 (`/join/[token]`) is a code comment, not user-visible |
| AUTH-01 | — | Magic link email | DEFERRED | Deferred to Phase 6 per REQUIREMENTS.md re-scope 2026-06-01 |
| AUTH-02 | — | Unique email subject per request | DEFERRED | Deferred to Phase 6 per REQUIREMENTS.md re-scope 2026-06-01 |
| AUTH-03 | 01-03/05 | Session persists across browser restarts (anonymous session) | SATISFIED (code) / HUMAN (device) | `@supabase/ssr` cookie-based session; `getUser()` in middleware; real-device confirmation pending |
| AUTH-04 | 01-05 | User can sign out from any screen | SATISFIED | `signOut` server action retained in `src/actions/auth.ts`; wired in Perfil tab |
| AUTH-05 | 01-08/09 | Anonymous join via typed invite code (re-scoped) | SATISFIED (code) / HUMAN (device) | Full path: `InviteCodeForm` -> `/join/[code]` -> `joinTripByCode` -> `get_trip_id_by_invite_code` RPC -> service-role upsert; data layer live; real-device test pending |
| AUTH-06 | — | Anonymous -> real account upgrade | DEFERRED | Deferred to Phase 6 per REQUIREMENTS.md re-scope 2026-06-01 |
| UI-01 | 01-01/09 | All UI in Spanish, no English visible | SATISFIED | All strings via `es.*`; no hardcoded English in JSX |
| UI-02 | 01-01 | Vibrant Tropical Sunset palette | SATISFIED | `globals.css` with full palette tokens confirmed in prior verification |
| UI-03 | 01-01 | Responsive from 320px to desktop | SATISFIED | `max-w-md mx-auto px-4` pattern confirmed in prior verification |

---

### Build + Type Check Results

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| TypeScript | `npx tsc --noEmit` | Exits 0, zero errors | PASS |
| Next.js build | `npm run build` | Exits 0; `/join/[code]` route present in output | PASS |
| Tests | `npm test` | 50/50 tests pass (5 test files) | PASS |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/common/ErrorToast.tsx` | 4 | Stale comment references `/join/[token]` (deleted route) and `/auth/callback` (deleted file) | Info | Code comment only, not user-visible; no functional impact; documentation drift |

**No TBD/FIXME/XXX markers found** in any files modified by Plans 08 or 09. No console-log-only implementations. No empty JSX returns. No hardcoded Spanish strings in new/modified components.

**ROADMAP SC-4 wording discrepancy:** ROADMAP.md SC-4 says "every 3 days" but `keep-alive.yml` runs `*/5 * * * *` (every 5 minutes) which matches INFRA-05 ("cada 5 minutos"). The ROADMAP SC-4 wording is stale documentation; the code satisfies INFRA-05. Not a functional gap.

---

### Behavioral Spot-Checks

| Behavior | Evidence | Status |
|----------|----------|--------|
| `/join/[code]` route registered | `npm run build` output shows `ƒ /join/[code]` | PASS |
| `joinTripByCode` calls correct RPC | `supabase.rpc('get_trip_id_by_invite_code', { lookup_code: code })` at line 68 | PASS |
| `sendMagicLink` fully removed | `grep -rn sendMagicLink src/` returns 0 matches | PASS |
| `MagicLinkForm` fully removed | file deleted + `grep -rn MagicLinkForm src/` returns 0 matches | PASS |
| `SinCuentaPill` is `<span>` not `<button>` | File confirmed as `<span>` with no `onClick` or `useBannerStore` | PASS |
| `AnonymousBanner` not rendered | `grep -c 'AnonymousBanner' src/app/t/[tripId]/layout.tsx` = 0 | PASS |
| `AnonymousUpgradeSheet` not rendered | `grep -rl '<AnonymousUpgradeSheet' src/` returns empty | PASS |

---

### Human Verification Required

All code is complete, wired, and tested. The following require a real device + production environment:

### 1. Production Deploy

**Test:** Run `vercel --prod --force` (per project memory — prod does NOT auto-deploy on push).
**Expected:** Deploy succeeds; `https://sharedtrip.vercel.app/` shows the invite-code entry screen.
**Why human:** Requires Vercel auth; production not auto-deployed.

### 2. Typed-Code Happy Path — AUTH-05 (re-scoped)

**Test:** Fresh Safari on iPhone with SharedTrip cookies cleared. Open `https://{domain}/`. Confirm welcome screen shows `es.entry.heading` ('Ingresa tu código de viaje') and a CODE input (not email). Type `test-ab12` (lowercase, trailing space allowed). Tap 'Entrar al viaje'. Observe spinner.
**Expected:** Lands at `/t/11111111-.../docs` within ~2s. No email prompt. Top header: trip name + mango 'Sin cuenta' pill + animal avatar. No email-upgrade banner below header.
**Why human:** Requires live Supabase with Anonymous Sign-ins enabled and real-device UX observation.

### 3. Membership Row Created in DB

**Test:** After Step 2, run in Supabase Dashboard SQL Editor: `SELECT user_id, role FROM public.trip_members WHERE trip_id='11111111-1111-1111-1111-111111111111' ORDER BY joined_at DESC LIMIT 5;`
**Expected:** New row with anonymous `user_id` (is_anonymous = true) and `role = 'member'`.
**Why human:** Requires live anonymous sign-in against real Supabase project.

### 4. Pill Is Inert (D-11)

**Test:** Tap the 'Sin cuenta' pill.
**Expected:** Nothing opens — no upgrade sheet, no state change. Pill is a static indicator.
**Why human:** Tap behavior requires a real device.

### 5. Session Persists Across Browser Restarts — AUTH-03

**Test:** Force-quit Safari, reopen, navigate to `/t/11111111-.../docs`.
**Expected:** Still inside trip; not bounced to `/`.
**Why human:** Cookie persistence across force-quit requires a real device.

### 6. Sign Out Returns to Code-Entry Screen — AUTH-04

**Test:** Perfil tab -> 'Cerrar sesión' -> confirm.
**Expected:** Returns to `/` showing the `InviteCodeForm` (code input, not email).
**Why human:** Requires live session and device.

### 7. Unknown Code Error Path

**Test:** Type `NOPE-9999`, tap submit.
**Expected:** Redirected to `/` with Spanish toast 'Este link de invitación no es válido…'; no membership row created.
**Why human:** Requires live RPC returning NULL for unknown code.

### 8. Malformed Code Inline Validation

**Test:** Type `hello` (no hyphen), tap submit.
**Expected:** Inline error 'Revisa el código: formato como EJEM-AB12.' under the field; no navigation, no network request.
**Why human:** Client-side Zod behavior requires browser to confirm no-network short-circuit.

### 9. Code-in-URL Fallback

**Test:** Sign out, navigate directly to `https://{domain}/join/test-ab12`.
**Expected:** Same result as happy path — anon join + land at `/t/11111111-.../docs`.
**Why human:** Requires live deployment and device.

### 10. GitHub Actions Keep-Alive

**Test:** `gh workflow run keep-alive.yml` then `gh run view {id} --log`.
**Expected:** Conclusion `success`; curl log shows HTTP 200 from Supabase REST endpoint.
**Why human:** Requires GitHub auth and live workflow.

### 11. Production Manifest

**Test:** After redeploy, GET `https://sharedtrip.vercel.app/manifest.webmanifest`.
**Expected:** HTTP 200, `Content-Type: application/manifest+json`, JSON contains `name: 'SharedTrip'`, `lang: 'es'`, `display: 'standalone'`.
**Why human:** Requires prod redeploy to serve updated build.

---

### Gaps Summary

No BLOCKERS. All code artifacts exist, are substantive, and are fully wired. Plans 08+09 are complete:

- The typed-invite-code data layer (Plan 08) is live in Supabase — confirmed by the human checkpoint with 4/4 SQL verification queries.
- The entry UI slice (Plan 09) is complete — `InviteCodeForm`, `joinTripByCode`, `/join/[code]` route, magic-link removal, banner gating, pill staticification all verified in code; build green, 50/50 tests pass, tsc exits 0.
- AUTH-01, AUTH-02, AUTH-06 correctly absent — deferred to Phase 6 per REQUIREMENTS.md.

The phase is blocked only on real-device + production confirmation (11 human verification items above). No code gaps remain.

---

*Verified: 2026-06-03T20:00:00Z*
*Verifier: Claude (gsd-verifier)*
*Re-verification: Yes — initial verification covered Plans 01-01..07; this re-verification covers Plans 08+09 (re-scope to typed invite-code entry)*
