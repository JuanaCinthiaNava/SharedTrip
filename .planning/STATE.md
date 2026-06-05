---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 06
current_plan: Not started
status: executing
last_updated: "2026-06-05T19:17:34.355Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 14
  completed_plans: 9
  percent: 17
---

# Project State: SharedTrip

**Last updated:** 2026-06-03
**Milestone:** v1 — before next trip (deadline: < 1 month from 2026-05-29)

---

## Project Reference

**Core value:** Recuperar al instante el boleto/reservación correcto cuando lo necesitas — incluso sin internet.

**Stack:** Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Supabase (Auth + PostgreSQL + Storage + Realtime) + Serwist + Dexie.js + Vercel

**Current focus:** Phase 02 — Trip + Member Management (next to plan). Phase 06 (cuentas-email) remains deferred until a verified email domain exists.

---

## Current Position

Phase: 01 (foundation-auth) — EXECUTING
Plan: 1 of 9
**Current phase:** 06
**Current plan:** Not started
**Status:** Ready to execute
**Progress:** [██████████] 100% (All 9 Phase 1 plans complete — code verified; human UAT pending)

```
[ ] Phase 1: Foundation + Auth  ← human_needed (see 01-VERIFICATION.md)
[ ] Phase 2: Trip + Member Management
[ ] Phase 3: Document Vault + PWA Offline
[ ] Phase 4: Itinerary + Realtime
[ ] Phase 5: Polish + Real-device QA
```

### Phase 1 Verification Summary

**Automated verification score:** 14/16 must-haves verified
**Report:** `.planning/phases/01-foundation-auth/01-VERIFICATION.md`

**What passed:**

- All 5 plans complete (5/5 commits pushed to main)
- `npm run build` exits 0, `tsc --noEmit` exits 0, `npm test` 7/7 passing
- All 32+ artifacts exist, are substantive, and are wired correctly
- Schema: 6 tables, RLS on all tables, 17 policies, `is_trip_member` SECURITY DEFINER, storage RLS
- Auth: `@supabase/ssr` (not deprecated auth-helpers), `getUser()` only (no `getSession()`), T-03-06 open-redirect guard
- i18n: `es.ts` complete with all namespaces; zero English user-facing text in components
- PWA manifest: code correct, builds correctly; production 404 needs redeploy (not a code bug)
- Keep-alive: `*/5 * * * *` cron, correct secret usage

**What requires human device testing (PENDING — DEFERRED from 01-09 checkpoint):**

0. Deploy: `vercel --prod --force` (prod does NOT auto-deploy on push)
1. Typed invite-code happy path (AUTH-05 re-scoped) — real iPhone, typed code TEST-AB12 → anon join → land in trip, no email, no banner
2. DB membership check — new trip_members row with anonymous user_id
3. Pill is inert — tap "Sin cuenta" pill, nothing opens
4. Anonymous session persistence (AUTH-03) — force-quit Safari, reopen, still inside trip
5. Sign out (AUTH-04) — Cerrar sesión returns to / (code-entry welcome screen)
6. Unknown code error path — NOPE-9999 → invalidJoinToken toast, no membership
7. Malformed code inline validation — 'hello' → es.entry.invalidFormat inline, no navigation
8. Code-in-URL fallback — /join/test-ab12 → anon join + land in trip
9. Production manifest.webmanifest — verify installability after redeploy

Full 8-step test script: `.planning/phases/01-foundation-auth/01-09-SUMMARY.md` (Checkpoint: DEFERRED section)

**Minor deviations (non-blocking):**

- AnonymousBanner.tsx (preserved for Phase 6) internally contains `<AnonymousUpgradeSheet` — not rendered in any v1 path; build passes; grep verify adjusted with exclusion
- ROADMAP.md Progress Table shows `4/5` — stale, should be `5/5`

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 5 |
| Phases complete | 0 |
| Plans complete | 5 |
| Requirements mapped | 48/48 |
| Deadline | 2026-06-29 (approx) |

---
| Phase 01-foundation-auth P01 | 539 | 4 tasks | 19 files |
| Phase 01-foundation-auth P02 | 30 | 2 tasks | 6 files |
| Phase 01-foundation-auth P03 | 25 | 3 tasks | 11 files |
| Phase 01-foundation-auth P04 | 35m | 3 tasks | 19 files |
| Phase 01-foundation-auth P05 | 25m | 3 tasks | 11 files |

## Accumulated Context

### Decisions Locked

| Decision | Rationale |
|----------|-----------|
| Next.js 16 App Router | Official PWA support, Server Actions for auth security boundary, free Vercel deployment |
| Supabase as sole backend | Covers auth + DB + storage + realtime in one platform; $0/month at personal-circle scale |
| `@serwist/next` (not next-pwa) | next-pwa is broken with Next.js 16 Turbopack and unmaintained |
| `@supabase/ssr` (not auth-helpers) | auth-helpers-nextjs is deprecated |
| Dexie.js for IndexedDB | Caches document blobs offline; `useLiveQuery` for reactive rendering |
| Tailwind v4 CSS-first config | No tailwind.config.js; use `@import "tailwindcss"` in globals.css |
| Signed upload URL pattern | File bytes never pass through Next.js (Vercel 4.5MB body limit) |
| `is_trip_member()` SECURITY DEFINER | Prevents N+1 RLS queries and recursion risk |
| Tables created before is_trip_member() in migration | PostgreSQL validates sql function bodies against existing relations at creation time — function must come after trip_members table |
| All RLS policies use (SELECT auth.uid()) | Prevents per-row re-evaluation of auth.uid(); required performance pattern per RESEARCH Anti-Patterns |
| Anonymous-first join | Frictionless group invite — no email required to see the trip |
| Spanish-only UI via `es.ts` dictionary | i18n-ready without i18n library overhead |
| Phase 5 = QA gate, no new requirements | Hardens Phases 1-4 before real trip; not scope creep |
| Simple magic link (signInWithOtp) approach | No admin.generateLink() + Resend SDK needed — subject uniqueness via {{ .Token }} in Supabase template |
| getUser() only in middleware, never getSession() | getUser() revalidates JWT server-to-server; getSession() reads stale local cookie — security anti-pattern |
| T-03-06 open-redirect guard in /auth/callback | Validates ?next param starts with / and not // before redirect |
| **Entry = typed invite code (anonymous), not magic-link** (2026-06-01) | v1 entry is a short hybrid code (`MARR-4F9K`) typed by the user → anonymous join → set name. Magic-link/email dropped from v1: no domain (Resend `onboarding@resend.dev` only reaches the account owner) + Microsoft Safe Links consumes one-time links. Email/recovery → Phase 6. See `.planning/notes/entry-model-invite-code.md` |
| **trips.invite_code text NOT NULL UNIQUE** (2026-06-02, Plan 01-08) | Added alongside vestigial invite_token. Resolver get_trip_id_by_invite_code(text) SECURITY DEFINER normalizes input via upper(trim()); returns NULL on miss. invite_token retained to avoid editing shipped migrations. Seed trip resolves from 'TEST-AB12'. |
| **uuid /join/[token] route retired; /join/[code] replaces it** (2026-06-03, Plan 01-09) | joinTripByCode(code) replaces joinTrip(token); only resolution RPC changes; service-role upsert (anon-join-architecture) verbatim. CODE_RE /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/ for hybrid format validation. |
| **Magic-link removed from v1 critical path** (2026-06-03, Plan 01-09) | sendMagicLink, MagicLinkForm, /auth/callback, /auth/check-email deleted. signOut retained. Email/magic-link deferred to Phase 6. |
| **D-12 email-upgrade banner deferred; D-11 SinCuentaPill made static** (2026-06-03, Plan 01-09) | AnonymousBanner render removed from trip layout; AnonymousUpgradeSheet wiring removed from TopHeader; SinCuentaPill changed from `<button onClick=openUpgradeSheet>` to `<span>` static indicator. Both Phase 6 files retained on disk. |

### Roadmap Evolution

- **2026-06-01 — Phase 6 added (Cuentas y Email, deferred):** magic-link/email entry re-scoped out of v1. AUTH-01, AUTH-02, AUTH-06 moved Phase 1 → Phase 6. Phase 1 entry redefined as typed invite-code anonymous join. Phase 6 triggers post-v1 or when a Resend domain is verified. Re-scope implementation pending — see `.planning/todos/pending/rescope-phase-01-invite-code.md` + `invite-code-schema.md`.

### Critical Pitfalls (address in stated phases)

| Pitfall | Severity | Phase |
|---------|----------|-------|
| iOS Safari 7-day IndexedDB eviction | CRITICAL | Phase 1 (navigator.storage.persist()), Phase 3 (re-cache on launch) |
| Supabase RLS disabled by default | CRITICAL | Phase 1 (every table migration) — MITIGATED |
| Next.js 1MB body limit on file uploads | CRITICAL | Phase 3 (signed URL pattern — never proxy files) |
| Gmail magic link threading (expired link) | HIGH | Phase 1 (unique email subject per request) — MITIGATED in code |
| Magic link same-browser restriction on iOS | HIGH | Phase 1 (implicit flow or OTP fallback) — human test pending |
| Supabase free tier pause (30s cold start) | HIGH | Phase 1 (GitHub Actions keep-alive cron) — MITIGATED |
| Silent offline upload failure | HIGH | Phase 3 (block upload when offline + clear messaging) |
| EXIF rotation on iPhone photos | MEDIUM | Phase 3 (client-side EXIF correction before upload) |

### Architecture Constraints

- Files upload directly from browser to Supabase Storage via signed URLs — never through Next.js server
- RLS enabled on every table at migration time — test from client SDK, not SQL editor
- Service worker caches app shell (Serwist precache); document blobs cached in IndexedDB (Dexie) — not Cache API
- Supabase Realtime `postgres_changes` on `itinerary_items` requires RLS SELECT policy to pass
- `expenses` and `locations` tables created in Phase 1 migrations (empty, for v1.5/v2) — avoids mid-project schema changes

### Open Questions

- Email deliverability: Supabase built-in SMTP may land in spam. Have Resend (free tier, custom SMTP) as ready fallback — configure if first real user reports missing magic link email.
- Anonymous session persistence on iOS: Supabase anonymous sessions stored in localStorage. Verify survival of 7-day ITP cycle without Home Screen install. May need cookie-based session fallback.
- Signed URL caching: Cache the blob bytes in Dexie (not the signed URL itself — URLs expire in 1 hour). Verify Dexie + Serwist integration pattern in Phase 3 planning.

### Todos

- [x] Create Next.js 16 project with TypeScript + Tailwind v4 + App Router
- [x] Set up Supabase project (DB + Auth + Storage + Realtime enabled)
- [x] Configure Supabase CLI for local development
- [x] Run Phase 1 planning: `/gsd:plan-phase 1`
- [ ] Complete Phase 1 human UAT: run `vercel --prod --force` first, then 8-step iPhone test (TEST-AB12 entry, session persistence, sign out, error paths, URL fallback) — see 01-09-SUMMARY.md for full script
- [ ] Confirm no email/magic-link UAT needed (AUTH-01/02/06 deferred to Phase 6)
- [x] Fix `src/app/auth/check-email/page.tsx:42`: file deleted (magic-link removed from v1, Plan 09)

### Blockers

None active. (01-08 human-action checkpoint cleared 2026-06-03: migration 20260530000006_invite_code.sql applied to live Supabase via Dashboard SQL Editor; all 4 verification queries confirmed.)

---

## Session Continuity

**To resume:** All 9 Phase 1 plans complete (01-09 finalized 2026-06-03). Remaining action: deploy via `vercel --prod --force` then run AUTH-05 re-scoped UAT on a real iPhone (8-step script in 01-09-SUMMARY.md). After human UAT passes, Phase 1 is fully done and Phase 2 planning can begin.

**Phase 1 entry point:** `.planning/ROADMAP.md` Phase 1 detail — INFRA-01..07 + AUTH-01..06 + UI-01..03.

**Key files:**

- `.planning/PROJECT.md` — core value, constraints, decisions
- `.planning/REQUIREMENTS.md` — all v1 requirements with REQ-IDs
- `.planning/ROADMAP.md` — this roadmap
- `.planning/STATE.md` — this file
- `.planning/phases/01-foundation-auth/01-VERIFICATION.md` — phase verification report (14/16 verified, human_needed)
- `.planning/research/ARCHITECTURE.md` — build order, data model, RLS patterns, code snippets
- `.planning/research/PITFALLS.md` — critical gotchas with per-phase guidance
- `.planning/research/STACK.md` — exact versions, installation commands

---

*State initialized: 2026-05-29 after roadmap creation*
*Last updated: 2026-05-30 after Phase 1 automated verification*
