---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_plan: 5
status: ready-for-verify
last_updated: "2026-05-30T01:00:00.000Z"
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

**Current focus:** Phase 01 — foundation-auth (READY FOR HUMAN VERIFY)

---

## Current Position

Phase: 01 (foundation-auth) — READY FOR VERIFY (checkpoint:human-verify at Plan 05 Task 4)
Plan: 5 of 5
**Current phase:** 01
**Current plan:** 5
**Status:** ready-for-verify
**Progress:** [██████████] 100% (Phase 1 plans complete — awaiting human verification)

```
[ ] Phase 1: Foundation + Auth
[ ] Phase 2: Trip + Member Management
[ ] Phase 3: Document Vault + PWA Offline
[ ] Phase 4: Itinerary + Realtime
[ ] Phase 5: Polish + Real-device QA
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 5 |
| Phases complete | 0 |
| Plans complete | 2 |
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
| Supabase RLS disabled by default | CRITICAL | Phase 1 (every table migration) |
| Next.js 1MB body limit on file uploads | CRITICAL | Phase 3 (signed URL pattern — never proxy files) |
| Gmail magic link threading (expired link) | HIGH | Phase 1 (unique email subject per request) |
| Magic link same-browser restriction on iOS | HIGH | Phase 1 (implicit flow or OTP fallback) |
| Supabase free tier pause (30s cold start) | HIGH | Phase 1 (GitHub Actions keep-alive cron) |
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

- [ ] Create Next.js 16 project with TypeScript + Tailwind v4 + App Router
- [ ] Set up Supabase project (DB + Auth + Storage + Realtime enabled)
- [ ] Configure Supabase CLI for local development
- [ ] Run Phase 1 planning: `/gsd:plan-phase 1`

### Blockers

None currently.

---

## Session Continuity

**To resume:** Phase 1 is complete. Human verification of anonymous join flow on real iPhone required (see 01-05-PLAN.md checkpoint:human-verify Task 4). After verification, run `/gsd:execute-phase 02` to start Phase 2.

**Phase 1 entry point:** `.planning/ROADMAP.md` Phase 1 detail — INFRA-01..07 + AUTH-01..06 + UI-01..03.

**Key files:**

- `.planning/PROJECT.md` — core value, constraints, decisions
- `.planning/REQUIREMENTS.md` — all v1 requirements with REQ-IDs
- `.planning/ROADMAP.md` — this roadmap
- `.planning/STATE.md` — this file
- `.planning/research/ARCHITECTURE.md` — build order, data model, RLS patterns, code snippets
- `.planning/research/PITFALLS.md` — critical gotchas with per-phase guidance
- `.planning/research/STACK.md` — exact versions, installation commands

---

*State initialized: 2026-05-29 after roadmap creation*
