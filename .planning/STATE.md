---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_plan: 5
status: human_needed
last_updated: "2026-05-30T01:10:00.000Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 5
  completed_plans: 5
  percent: 20
---

# Project State: SharedTrip

**Last updated:** 2026-05-30
**Milestone:** v1 — before next trip (deadline: < 1 month from 2026-05-29)

---

## Project Reference

**Core value:** Recuperar al instante el boleto/reservación correcto cuando lo necesitas — incluso sin internet.

**Stack:** Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Supabase (Auth + PostgreSQL + Storage + Realtime) + Serwist + Dexie.js + Vercel

**Current focus:** Phase 01 — foundation-auth (VERIFICATION: human_needed — automated checks passed, awaiting real-device tests)

---

## Current Position

Phase: 01 (foundation-auth) — HUMAN_NEEDED (all code verified; awaiting real-device + dashboard confirmation)
Plan: 5 of 5
**Current phase:** 01
**Current plan:** 5
**Status:** human_needed
**Progress:** [██████████] 100% (Phase 1 plans complete — automated verification passed, human UAT pending)

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

**What requires human device testing:**
1. Magic link flow end-to-end (AUTH-01, AUTH-02, AUTH-03) — Resend SMTP + real iPhone
2. Anonymous join flow (AUTH-05) — Supabase anon sign-ins enabled + real device
3. Anonymous upgrade (AUTH-06) — live email confirmation link
4. Supabase dashboard config: anon sign-ins enabled, OTP expiry 900s, Magic Link template
5. GitHub Actions keep-alive manual workflow_dispatch confirmation
6. Production manifest.webmanifest: requires `vercel --prod` redeploy

**Minor deviations (non-blocking):**
- `"Volver al inicio"` hardcoded in `check-email/page.tsx:42` (not in `es.ts`)
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
- [ ] Complete Phase 1 human UAT: real iPhone magic link + anonymous join tests
- [ ] Run `vercel --prod` to redeploy (fixes manifest.webmanifest 404 on production)
- [ ] Fix ROADMAP.md Progress Table: update Phase 1 from `4/5` to `5/5 | human_needed`
- [ ] Fix `src/app/auth/check-email/page.tsx:42`: add `es.auth.backToHome` key and use it

### Blockers

None — all code is complete. Human UAT and minor cleanup tasks remain.

---

## Session Continuity

**To resume:** Phase 1 automated verification passed (14/16). Complete human UAT items listed above (see `.planning/phases/01-foundation-auth/01-VERIFICATION.md` Human Verification section). After all items pass, update ROADMAP.md Phase 1 status to `Complete` and run `/gsd:execute-phase 02` to start Phase 2.

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
