---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_plan: 1
status: executing
last_updated: "2026-05-29T22:50:16.970Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 5
  completed_plans: 1
  percent: 0
---

# Project State: SharedTrip

**Last updated:** 2026-05-29
**Milestone:** v1 — before next trip (deadline: < 1 month from 2026-05-29)

---

## Project Reference

**Core value:** Recuperar al instante el boleto/reservación correcto cuando lo necesitas — incluso sin internet.

**Stack:** Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Supabase (Auth + PostgreSQL + Storage + Realtime) + Serwist + Dexie.js + Vercel

**Current focus:** Phase 01 — foundation-auth

---

## Current Position

Phase: 01 (foundation-auth) — EXECUTING
Plan: 2 of 5
**Current phase:** 01
**Current plan:** 1
**Status:** Ready to execute
**Progress:** [██░░░░░░░░] 20%

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
| Plans complete | 0 |
| Requirements mapped | 48/48 |
| Deadline | 2026-06-29 (approx) |

---
| Phase 01-foundation-auth P01 | 539 | 4 tasks | 19 files |

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
| Anonymous-first join | Frictionless group invite — no email required to see the trip |
| Spanish-only UI via `es.ts` dictionary | i18n-ready without i18n library overhead |
| Phase 5 = QA gate, no new requirements | Hardens Phases 1-4 before real trip; not scope creep |

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

**To resume:** Run `/gsd:plan-phase 1` to generate the execution plan for Phase 1 (Foundation + Auth).

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
