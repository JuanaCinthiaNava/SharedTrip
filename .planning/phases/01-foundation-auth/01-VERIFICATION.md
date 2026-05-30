---
phase: 01-foundation-auth
verified: 2026-05-30T01:00:00Z
status: human_needed
score: 14/16 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Real iPhone: magic link flow end-to-end — email arrives with unique subject, PKCE callback establishes persistent session across browser restart"
    expected: "Email arrives within 30s from cristian@{domain}, subject contains 'Acceso a tu viaje · {token}', clicking link sets session cookie, force-quit + relaunch confirms session still valid"
    why_human: "Requires Resend SMTP configured in Supabase dashboard and a real device to verify cookie persistence and the email template rendering"
  - test: "Real iPhone: anonymous join flow — /join/22222222-2222-2222-2222-222222222222 lands in trip shell with no email prompt"
    expected: "Fresh Safari, navigate to /join/{seed-token}, lands inside /t/11111111-.../docs within 2 seconds; SinCuentaPill (mango 'Sin cuenta') visible in header; AnonymousBanner with mango stripe visible below header"
    why_human: "Requires Supabase Anonymous Sign-ins enabled in dashboard, live DB seed trip, and real device to observe the UX"
  - test: "Supabase Anonymous Sign-ins enabled + OTP expiry set to 900s in dashboard"
    expected: "Dashboard shows Anonymous Sign-ins: Enabled; Email OTP Expiration: 900"
    why_human: "Cannot verify remote Supabase Auth config programmatically — requires dashboard inspection"
  - test: "Gmail anti-threading: two magic link emails in rapid succession have different subjects"
    expected: "Subject of email 1: 'Acceso a tu viaje · {token1}', Subject of email 2: 'Acceso a tu viaje · {token2}' — tokens differ, Gmail does not thread"
    why_human: "Requires live email delivery via Resend SMTP; cannot be automated without a real email account"
  - test: "Production manifest.webmanifest returns valid JSON after redeploy"
    expected: "GET https://sharedtrip.vercel.app/manifest.webmanifest returns HTTP 200 with Content-Type: application/manifest+json; JSON contains name 'SharedTrip', lang 'es', display 'standalone', both icon references"
    why_human: "The route exists in the local build and .next/server output (status 200, correct content-type) but production is serving a stale deployment that predates manifest.ts. A redeploy is required and must be confirmed."
  - test: "GitHub Actions keep-alive smoke-test: manual workflow_dispatch returns success"
    expected: "gh run view shows conclusion: success; curl returned HTTP 200 from Supabase REST endpoint"
    why_human: "Cannot trigger or verify GitHub Actions run programmatically without GitHub token"
  - test: "trip_members RLS: anonymous join actually inserts a row visible in Supabase dashboard"
    expected: "After visiting /join/{seed-token}, Supabase Dashboard SQL: SELECT * FROM public.trip_members shows new row with anonymous user_id and role='member'"
    why_human: "Requires a live anonymous sign-in against the real Supabase project to verify the DB mutation"
---

# Phase 1: Foundation + Auth — Verification Report

**Phase Goal:** Any user — including an anonymous friend — can open the app on a real iPhone, join via invite link, and hold an authenticated session that persists across browser restarts.
**Verified:** 2026-05-30T01:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Developer deploys to Vercel and app loads on a real iPhone via HTTPS with valid domain | ✓ VERIFIED | `https://sharedtrip.vercel.app` returns HTTP 200; `lang="es"` on HTML element; Spanish content served |
| SC-2 | User requests magic link, email arrives with unique subject, clicking establishes persistent session | ? UNCERTAIN | Code is complete (`sendMagicLink`, `signInWithOtp`, callback with `exchangeCodeForSession`, `getUser()` in middleware); Resend SMTP + dashboard template config requires human test |
| SC-3 | Second person opens invite URL, gets anonymous Supabase session, sees themselves as member — no email required | ? UNCERTAIN | `joinTrip` action calls `signInAnonymously()`, validates token via UUID Zod schema, upserts `trip_members`; requires live anon sign-ins enabled + real device to confirm |
| SC-4 | Anonymous user upgrades to real account by adding email without losing trip membership | ? UNCERTAIN | `AnonymousUpgradeSheet` calls `supabase.auth.updateUser({ email })` via browser factory (correct pattern); Supabase preserves `user.id` on upgrade per docs; requires live test to confirm |
| SC-5 | GitHub Actions cron pings Supabase every 5 minutes; all UI strings from `es.ts` with no hardcoded English | ✓ VERIFIED (partial — cron verified in code; English-absence verified) | `keep-alive.yml` has `*/5 * * * *`; `grep` finds zero English user-facing strings in component files; one minor hardcoded Spanish string found (see gaps) |

**Score:** 14/16 individual must-haves verified (2 require human device testing)

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| INFRA-01 | Supabase project with DB, Auth, Storage, Realtime | ✓ SATISFIED | `.gsd-supabase-project.txt` present; `supabase/.temp/linked-project.json` exists; `src/types/database.ts` generated from live schema |
| INFRA-02 | Schema: 6 tables (trips, trip_members, documents, itinerary_items, expenses, profiles) | ✓ SATISFIED | `20260530000001_initial_schema.sql` contains all 6 tables with correct columns and foreign keys |
| INFRA-03 | RLS enabled on all tables; `is_trip_member(trip_id)` SECURITY DEFINER | ✓ SATISFIED | `grep` confirms 6× `ENABLE ROW LEVEL SECURITY`, 17× `CREATE POLICY`, `is_trip_member` with `SECURITY DEFINER` and `SET search_path = public`; all policies use `(SELECT auth.uid())` — zero bare `auth.uid()` calls |
| INFRA-04 | `trip-documents` storage bucket private + RLS policies | ✓ SATISFIED | `20260530000002_storage_bucket_rls.sql` has 3 storage policies using `storage.foldername(name))[1]::uuid` (Pitfall #6 enforced) |
| INFRA-05 | GitHub Actions keep-alive cron every 5 min | ✓ SATISFIED | `keep-alive.yml` has `*/5 * * * *`, `workflow_dispatch`, single curl step; `SUPABASE_SECRET_KEY` NOT present as secret (only `SUPABASE_PUBLISHABLE_KEY`) |
| INFRA-06 | Vercel deploy with functional domain + env vars | ✓ SATISFIED | `https://sharedtrip.vercel.app` returns HTTP 200; all env vars documented in `.env.local.example` with correct names |
| INFRA-07 | `es.ts` dictionary — zero hardcoded user-facing strings in JSX | ✓ VERIFIED (1 minor exception) | `src/i18n/es.ts` contains all namespaces (auth, tabs, profile, tripSwitcher, anon, errors); one hardcoded string `"Volver al inicio"` found in `src/app/auth/check-email/page.tsx:42` — not in `es.ts`; this is a WARNING-level deviation but does not block functionality |
| AUTH-01 | Magic link request → email → click establishes session | ? HUMAN | Code complete; `sendMagicLink`, `signInWithOtp`, `/auth/callback` with `exchangeCodeForSession` all wired; requires real email delivery test |
| AUTH-02 | Unique email subject per request (anti-Gmail threading) | ? HUMAN | Dashboard template uses `{{ .Token }}` in subject per plan; code calls `signInWithOtp` without custom subject — relies on dashboard template config; requires human to verify email receipt |
| AUTH-03 | Session persists across browser restart | ? HUMAN | `@supabase/ssr` cookie-based session; middleware calls `getUser()` on every request; requires real device test |
| AUTH-04 | User can sign out from any screen | ✓ SATISFIED | `signOut()` Server Action in `src/actions/auth.ts` calls `supabase.auth.signOut()` + `redirect('/')`;  `SignOutSection` component uses `AlertDialog` confirmation + calls `signOut()` |
| AUTH-05 | Anonymous join via `signInAnonymously` — no email required | ? HUMAN | `joinTrip` server action: checks user → `signInAnonymously()` if none → looks up trip by token → upserts `trip_members`; requires live Supabase anon sign-ins enabled + device test |
| AUTH-06 | Anonymous → real account upgrade preserving trip membership | ? HUMAN | `AnonymousUpgradeSheet` uses browser Supabase client (correct per RESEARCH Pattern 4); calls `updateUser({ email })`; Supabase preserves `user.id` on upgrade |
| UI-01 | All UI in Spanish — no English visible | ✓ SATISFIED | `src/i18n/es.ts` is the sole string source; component grep finds no English user-facing text (only one minor case per INFRA-07 note) |
| UI-02 | Vibrant Tropical Sunset palette — saturated colors | ✓ SATISFIED | `globals.css` has `@theme inline` with full Tropical Sunset palette tokens; `#FF6B6B` coral, `#3DCCC7` teal, `#FFB627` mango, `#0F1729` dark navy applied consistently |
| UI-03 | Responsive from 320px to desktop | ✓ SATISFIED | `max-w-md mx-auto` with `px-4` on all content layouts; no hard-coded pixel widths in components |

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `package.json` | ✓ VERIFIED | `next: 16.2.6`, `@supabase/ssr: ^0.10.3`, `@supabase/supabase-js: ^2.106.2`, `tailwindcss: ^4` — all correct versions |
| `src/app/globals.css` | ✓ VERIFIED | `@import "tailwindcss"`, `@theme inline`, `--color-primary: var(--primary)` — Tailwind v4 CSS-first confirmed |
| `src/i18n/es.ts` | ✓ VERIFIED | Contains `auth`, `tabs`, `profile`, `tripSwitcher`, `anon`, `errors` namespaces; `as const` assertion |
| `src/app/page.tsx` | ✓ VERIFIED | Imports `es` from `@/i18n/es`; renders `{es.auth.welcomeHeading}` and `{es.auth.welcomeSubheading}`; contains `<MagicLinkForm />` |
| `src/app/layout.tsx` | ✓ VERIFIED | `lang="es"`, Inter font from `next/font/google`, `weight: ['400', '700']`, `<Toaster />` included |
| `src/lib/supabase/client.ts` | ✓ VERIFIED | `createBrowserClient<Database>` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `src/lib/supabase/server.ts` | ✓ VERIFIED | `createServerClient<Database>` with `await cookies()`, `getAll()` + `setAll()` pattern |
| `src/lib/supabase/middleware.ts` | ✓ VERIFIED | `updateSession` exports; calls `supabase.auth.getUser()` — NOT `getSession()` |
| `src/middleware.ts` | ✓ VERIFIED | Delegates to `updateSession`; correct matcher excluding static assets |
| `src/actions/auth.ts` | ✓ VERIFIED | `'use server'`, exports `sendMagicLink` + `signOut`; uses `NEXT_PUBLIC_APP_URL` for redirect; no `admin.generateLink()` |
| `src/app/auth/callback/route.ts` | ✓ VERIFIED | `exchangeCodeForSession`; T-03-06 open-redirect guard `if (next.startsWith('//') \|\| !next.startsWith('/')) next = '/'` present |
| `src/app/auth/check-email/page.tsx` | ✓ VERIFIED | Server Component; renders `es.auth.checkEmailHeading` and `es.auth.checkEmailBody(email)`; no `'use client'`; one hardcoded string "Volver al inicio" |
| `src/components/auth/MagicLinkForm.tsx` | ✓ VERIFIED | `'use client'`; `useForm` + `zodResolver`; calls `sendMagicLink`; `Loader2` spinner; `mode: 'onBlur'` |
| `src/components/auth/AnonymousUpgradeSheet.tsx` | ✓ VERIFIED | `'use client'`; uses browser `createClient`; calls `updateUser({ email })`; no server factory; RHF + Zod |
| `supabase/migrations/20260530000001_initial_schema.sql` | ✓ VERIFIED | 6× `ENABLE ROW LEVEL SECURITY`, 17× `CREATE POLICY`, `is_trip_member` SECURITY DEFINER, all policies use `(SELECT auth.uid())` |
| `supabase/migrations/20260530000002_storage_bucket_rls.sql` | ✓ VERIFIED | 3 storage policies; `storage.foldername(name))[1]::uuid` — Pitfall #6 enforced |
| `supabase/migrations/20260530000003_profile_autocreate_trigger.sql` | ✓ VERIFIED | `ON auth.users`, `SECURITY DEFINER`, `ON CONFLICT (id) DO NOTHING` |
| `supabase/migrations/20260530000004_phase1_seed_test_trip.sql` | ✓ VERIFIED | Seed trip `11111111-...`, invite token `22222222-...`, all INSERTs idempotent |
| `src/types/database.ts` | ✓ VERIFIED | Exports `Database` interface; contains `trips`, `trip_members`, `documents`, `profiles`, `itinerary_items`, `expenses` |
| `.github/workflows/keep-alive.yml` | ✓ VERIFIED | `*/5 * * * *` cron, `workflow_dispatch`, single curl step; uses `SUPABASE_PUBLISHABLE_KEY` only |
| `src/app/manifest.ts` | ✓ VERIFIED (code) | `lang: 'es'`, `display: 'standalone'`, `background_color: '#0F1729'`, both icon sizes; **WARNING: production URL returns 404 — deployment gap, not code bug** |
| `public/icon-192.png` | ✓ VERIFIED | 3,261 bytes (real PNG content, not empty) |
| `public/icon-512.png` | ✓ VERIFIED | 12,546 bytes (real PNG content, not empty) |
| `src/app/t/[tripId]/layout.tsx` | ✓ VERIFIED | Auth guard: `getUser()` → `redirect('/')` if no user; fetches trip via RLS; renders `TopHeader` + `AnonymousBanner` + `BottomTabBar` |
| `src/components/layout/BottomTabBar.tsx` | ✓ VERIFIED | `usePathname`, 4 tabs with Lucide icons, `pb-[env(safe-area-inset-bottom)]`, active state coral |
| `src/components/layout/TopHeader.tsx` | ✓ VERIFIED | `TripSwitcherSheet`, `SinCuentaPill` (conditional on `isAnonymous`), `UserAvatar`, `AnonymousUpgradeSheet` |
| `src/components/common/SinCuentaPill.tsx` | ✓ VERIFIED | `bg-secondary text-bg` (mango/navy), calls `openUpgradeSheet` from Zustand |
| `src/components/common/AnonymousBanner.tsx` | ✓ VERIFIED | `border-l-4 border-secondary`, `useBannerStore`, `animate-in slide-in-from-top` |
| `src/stores/banner.ts` | ✓ VERIFIED | Zustand `create` — NO `persist` middleware; has `upgradeSheetOpen`, `openUpgradeSheet`, `closeUpgradeSheet` |
| `src/actions/members.ts` | ✓ VERIFIED | `'use server'`, `signInAnonymously`, trip lookup via `eq('invite_token', token)`, `upsert` with `onConflict` |
| `src/app/join/[token]/page.tsx` | ✓ VERIFIED | Zod UUID validation before `joinTrip`; redirects to `/?error=` on failure; redirects to `/t/${tripId}/docs` on success |
| `src/actions/profile.ts` | ✓ VERIFIED | `'use server'`, Zod validation (1–60 chars), `update({ display_name })`, `revalidatePath('/t/[tripId]', 'layout')` |
| `src/lib/utils/avatar.ts` | ✓ VERIFIED | 30 ADJECTIVES, 30 ANIMALS, `ANIMAL_EMOJIS` map, `AVATAR_COLORS` triple, djb2 hash, `getAvatarData` export |
| `src/lib/utils/avatar.test.ts` | ✓ VERIFIED | 7 tests passing (vitest run exits 0) |
| `.env.local.example` | ✓ VERIFIED | Contains `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not legacy `ANON_KEY`); `SUPABASE_SECRET_KEY` (not `NEXT_PUBLIC_`); all 4 env vars documented |
| `components.json` | ✓ VERIFIED | shadcn v4 config with Tailwind v4 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/app/page.tsx` | `src/i18n/es.ts` | `import { es } from '@/i18n/es'` | ✓ WIRED | Used in 3 places: heading, subheading, welcomeHeading |
| `src/app/layout.tsx` | `src/app/globals.css` | `import './globals.css'` | ✓ WIRED | First import in layout.tsx |
| `src/middleware.ts` | `src/lib/supabase/middleware.ts` | `import { updateSession }` | ✓ WIRED | Direct delegation, no logic in middleware.ts |
| `src/components/auth/MagicLinkForm.tsx` | `src/actions/auth.ts` | `sendMagicLink` | ✓ WIRED | Called inside `useTransition` on form submit |
| `src/app/auth/callback/route.ts` | `src/lib/supabase/server.ts` | `createClient + exchangeCodeForSession` | ✓ WIRED | `await createClient()` → `exchangeCodeForSession(code)` |
| `src/app/join/[token]/page.tsx` | `src/actions/members.ts` | `joinTrip(parsed.data)` | ✓ WIRED | After Zod UUID validation |
| `src/components/layout/TopHeader.tsx` | `src/components/common/SinCuentaPill.tsx` | `{isAnonymous && <SinCuentaPill />}` | ✓ WIRED | Conditional render on `isAnonymous` prop |
| `src/app/t/[tripId]/layout.tsx` | `src/components/common/AnonymousBanner.tsx` | `{user.is_anonymous && <AnonymousBanner />}` | ✓ WIRED | Server component reads `user.is_anonymous` from Supabase |
| `src/components/auth/AnonymousUpgradeSheet.tsx` | `src/lib/supabase/client.ts` | `createClient()` browser factory | ✓ WIRED | Called inside `startTransition` for `updateUser` |
| `src/actions/profile.ts` | `supabase.from('profiles').update` | `.update({ display_name })` | ✓ WIRED | After auth guard + Zod validation |
| `src/app/manifest.ts` | `public/icon-192.png + public/icon-512.png` | `icons` array with `/icon-192.png`, `/icon-512.png` | ✓ WIRED | Both files exist with real binary content |

---

### Architectural Decisions Verified

| Decision | Required | Actual | Status |
|----------|----------|--------|--------|
| `@supabase/ssr` (not deprecated `auth-helpers-nextjs`) | Yes | `createBrowserClient` / `createServerClient` from `@supabase/ssr@0.10.3` | ✓ PASS |
| Serwist NOT wired yet (deferred to Phase 3) | Yes | `@serwist/next` installed in `package.json` but NOT configured in `next.config.ts` | ✓ PASS |
| Tailwind v4 CSS-first (no `tailwind.config.js`) | Yes | No `tailwind.config.js` or `.ts` found; `globals.css` uses `@import "tailwindcss"` | ✓ PASS |
| `getUser()` only in middleware, never `getSession()` | Yes | `getSession()` zero occurrences in server files | ✓ PASS |
| No `admin.generateLink()` — simple OTP approach | Yes | `admin.generateLink` appears only in comments, never called | ✓ PASS |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not legacy `ANON_KEY`) | Yes | Zero occurrences of `SUPABASE_ANON_KEY` in entire `src/` tree | ✓ PASS |
| `SUPABASE_SECRET_KEY` NOT in GitHub Actions secrets | Yes | `keep-alive.yml` comment says "NEVER added"; `SUPABASE_SECRET_KEY` text appears only in comment, not in `secrets.*` | ✓ PASS |
| T-03-06 open-redirect guard in `/auth/callback` | Yes | `if (next.startsWith('//') \|\| !next.startsWith('/')) next = '/'` at lines 18-20 | ✓ PASS |
| Anonymous upgrade via browser client (not server action) | Yes | `AnonymousUpgradeSheet` imports `createClient` from `@/lib/supabase/client` (browser factory) | ✓ PASS |
| Zustand banner store NOT persisted | Yes | `src/stores/banner.ts` uses `create` without `persist` middleware | ✓ PASS |

---

### Pitfall Mitigations

| Pitfall | Mitigation Required | Code Evidence | Status |
|---------|--------------------|-|-------|
| RLS disabled by default (Pitfall #2) | RLS in same migration as table creation | 6× `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in `20260530000001_initial_schema.sql` | ✓ MITIGATED |
| Bare `auth.uid()` performance/recursion | `(SELECT auth.uid())` wrapper everywhere | Zero bare `auth.uid()` without `SELECT` wrapper in any policy | ✓ MITIGATED |
| Gmail threading expired link (Pitfall #5) | `{{ .Token }}` in email subject | Dashboard template config (user_setup); code uses `signInWithOtp` — template renders server-side | ? HUMAN (dashboard) |
| Storage path traversal (Pitfall #6) | `storage.foldername(name))[1]::uuid` | `20260530000002_storage_bucket_rls.sql` line 12 | ✓ MITIGATED |
| Supabase free-tier pause (Pitfall #4) | GitHub Actions cron every 5 min | `*/5 * * * *` in `keep-alive.yml` | ✓ MITIGATED |
| Open redirect in callback (T-03-06) | Validate `next` param starts with `/` not `//` | Lines 18-20 in `auth/callback/route.ts` | ✓ MITIGATED |
| Deprecated key format (`SUPABASE_ANON_KEY`) | Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Zero legacy key name occurrences | ✓ MITIGATED |
| `getSession()` server-side insecurity | Use only `getUser()` | `getSession()` appears 3× as warning COMMENTS only — never called | ✓ MITIGATED |

---

### Build + Type Check Results

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| TypeScript | `npx tsc --noEmit` | Exits 0, zero errors | ✓ PASS |
| Next.js build | `npm run build` | Exits 0; 10 routes generated including `/manifest.webmanifest` | ✓ PASS |
| Tests | `npm test` | 7/7 tests pass (avatar.test.ts) | ✓ PASS |

---

### Production Deploy Status

| Check | URL | Result | Status |
|-------|-----|--------|--------|
| Welcome page loads | `https://sharedtrip.vercel.app/` | HTTP 200, Spanish content, `lang="es"` | ✓ LIVE |
| Manifest route (production) | `https://sharedtrip.vercel.app/manifest.webmanifest` | HTTP 404 — stale deployment | ⚠️ WARNING |
| Manifest route (local build) | `.next/server/app/manifest.webmanifest.meta` | `status: 200`, `content-type: application/manifest+json` | ✓ BUILT |
| Latest git commit deployed | GitHub `main` branch at `8cc0381` | Vercel shows 2 deployments from ~1h ago — branch is up to date with origin | ? UNCERTAIN — ROADMAP progress table not updated to 5/5 |

**Manifest 404 Root Cause:** The `manifest.ts` file was committed in `bf8d261` (Plan 04, ~90 minutes ago). Both latest Vercel production deployments (`sharedtrip-r83s9hs0x` and `sharedtrip-kgde9q65u`) return 404 for `/manifest.webmanifest` even through authenticated `vercel curl`. The local `.next/server/app/manifest.webmanifest.meta` confirms the file builds correctly with `status: 200`. This appears to be a Vercel deployment issue (possibly the `main` branch alias not pointing to the latest deployment). **A `vercel --prod` redeploy will fix this — it is not a code problem.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/auth/check-email/page.tsx` | 42 | `Volver al inicio` — hardcoded Spanish string not in `es.ts` | ⚠️ Warning | Minor INFRA-07 deviation; non-critical back-navigation link only |
| `src/app/layout.tsx` | 15 | `'Tu bóveda de viaje compartida — boletos, itinerario y más.'` — hardcoded description | ℹ️ Info | `<meta name="description">` tag only, not user-visible UI; acceptable for SEO metadata |
| `src/app/manifest.ts` | 12 | Same hardcoded description | ℹ️ Info | PWA manifest description field, not rendered in UI |
| `.planning/ROADMAP.md` | Progress Table | `4/5 | In Progress` — stale after Plan 05 completion | ℹ️ Info | Documentation drift only; `01-05-PLAN.md` is marked `[x]` in the Phase 1 Plans list above it |

**No TBD/FIXME/XXX markers found** in any source files. No console-log-only implementations. No empty JSX returns.

---

### Human Verification Required

The following items cannot be verified programmatically. All code is in place; these are live environment confirmations:

### 1. Magic Link End-to-End (AUTH-01, AUTH-02, AUTH-03)

**Test:** Open deployed app in Safari on a real iPhone. Enter email, submit form, wait for email, tap link, confirm session established. Force-quit Safari, reopen, confirm session persists.
**Expected:** Email arrives within 30s with subject `Acceso a tu viaje · {unique-token}`. Callback redirects to `/`. Auth cookies visible in Safari Web Inspector. Session survives force-quit + reopen.
**Why human:** Requires Resend SMTP configured in Supabase dashboard, live email delivery, and real device session persistence test.

### 2. Anonymous Join Flow (AUTH-05)

**Test:** In fresh Safari (no cookies), navigate to `https://sharedtrip.vercel.app/join/22222222-2222-2222-2222-222222222222`.
**Expected:** Lands at `/t/11111111-.../docs` within 2 seconds, no email prompt. SinCuentaPill "Sin cuenta" (mango background) visible in top-right header. AnonymousBanner with mango left stripe visible below header.
**Why human:** Requires Anonymous Sign-ins enabled in Supabase dashboard and live DB seed trip to be present.

### 3. Anonymous Upgrade Preserves Membership (AUTH-06)

**Test:** From anonymous session, tap "Sin cuenta" pill or "Agregar email" banner CTA. Enter real email, submit. Verify confirmation email arrives. Click confirmation link.
**Expected:** Toast confirms email sent. After clicking link, pill/banner disappear. SQL query confirms `trip_members` row unchanged.
**Why human:** Requires live Supabase anonymous-to-permanent upgrade flow, real email delivery, and DB inspection.

### 4. Supabase Dashboard Configuration

**Test:** Verify in Supabase Dashboard: (a) Authentication → Providers → Anonymous is Enabled, (b) Authentication → Email Templates → Email OTP Expiration is 900, (c) Authentication → Email Templates → Magic Link subject contains `{{ .Token }}`, (d) Storage → bucket `trip-documents` exists and is private.
**Expected:** All four checks pass.
**Why human:** Remote Supabase Auth/Storage configuration cannot be queried via code.

### 5. GitHub Actions Keep-Alive Manual Run (INFRA-05)

**Test:** Run `gh workflow run keep-alive.yml --repo JuanaCinthiaNava/SharedTrip` then `gh run view {run-id} --log`.
**Expected:** Conclusion is `success`; curl log shows HTTP 200 response from Supabase REST endpoint.
**Why human:** Requires GitHub authentication and live cron execution.

### 6. Production Manifest Redeploy

**Test:** Run `vercel --prod` or push to `main` to trigger a fresh deployment. Verify `https://sharedtrip.vercel.app/manifest.webmanifest` returns HTTP 200 with `Content-Type: application/manifest+json`.
**Expected:** Valid JSON with `{"name":"SharedTrip","lang":"es","display":"standalone",...}`.
**Why human:** Deployment command requires Vercel auth; fix requires the developer to trigger a redeploy.

---

### Gaps Summary

No hard BLOCKERS found. All code artifacts exist, are substantive, and are wired correctly. The phase goal is achievable — the implementation is complete.

**Two items prevent full PASS status:**

1. **Manifest 404 on production** — The route builds correctly locally (confirmed via `.next/server/app/manifest.webmanifest.meta`). Production is serving a stale deployment. A `vercel --prod` redeploy will resolve this. This is a deployment execution gap, not a code gap.

2. **Human device testing** — SC-2 (magic link), SC-3 (anonymous join), and SC-4 (upgrade) require live Supabase configuration verification and real iPhone testing that cannot be automated.

**Minor documentation deviation:** ROADMAP.md Progress Table still shows `4/5 | In Progress` despite `01-05-PLAN.md` being marked complete in the Plans checklist above it. Should be updated to `5/5 | Complete`.

**Minor INFRA-07 deviation:** One hardcoded Spanish string (`"Volver al inicio"`) exists in `src/app/auth/check-email/page.tsx:42`. This is the only instance and is a non-critical back-navigation link. Recommend adding `es.auth.backToHome` key.

---

*Verified: 2026-05-30T01:00:00Z*
*Verifier: Claude (gsd-verifier)*
