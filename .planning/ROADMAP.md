# ROADMAP: SharedTrip v1

**Milestone:** v1 — Functional before the next real trip
**Deadline:** < 1 month from 2026-05-29
**Granularity:** Coarse (5 phases — dictated by hard dependency chain)
**Coverage:** 46/46 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Foundation + Auth** — Deployed shell, magic link + anonymous join working, RLS locked down, keep-alive active, i18n dictionary in place
- [ ] **Phase 2: Trip + Member Management** — Create trip, generate invite link, join as member, view/manage member list, edit/archive trip
- [ ] **Phase 3: Document Vault + PWA Offline** — Upload, view, offline cache, QR fullscreen, install prompt — the core value ships here
- [ ] **Phase 4: Itinerary + Realtime** — Collaborative chronological timeline with live updates, doc-to-event linking
- [ ] **Phase 5: Polish + Real-device QA** — iOS Safari hardening, performance, UI completeness before departure

---

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Any user — including an anonymous friend — can open the app on a real iPhone, join via invite link, and hold an authenticated session that persists across browser restarts.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Developer deploys to Vercel and the app loads on a real iPhone via HTTPS with a valid domain
  2. User requests a magic link, email arrives with a unique subject (timestamp in subject line), and clicking it establishes a persistent session that survives browser restart
  3. A second person opens an invite URL, gets an anonymous Supabase session, and sees themselves as a member — no email required
  4. An anonymous user upgrades to a real account by adding their email without losing trip membership
  5. A GitHub Actions cron pings Supabase every 3 days; all UI strings are served from `es.ts` with no hardcoded English visible
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js 16 + Tailwind v4 + shadcn + Tropical Sunset palette + welcome slice + Vercel deploy
- [x] 01-02-PLAN.md — Database schema (6 tables + RLS + is_trip_member + storage RLS) + profile autocreate trigger + seed test trip + GitHub Actions keep-alive cron
- [x] 01-03-PLAN.md — Magic link auth vertical slice (@supabase/ssr factories + middleware + signInWithOtp Server Action + /auth/callback + Resend SMTP)
- [x] 01-04-PLAN.md — Trip shell (bottom tab bar + top header + trip switcher) + Perfil tab (display name editor + sign-out) + PWA manifest + avatar generator
- [ ] 01-05-PLAN.md — Anonymous join + upgrade vertical slice (/join/[token] + signInAnonymously + Sin cuenta pill + dismissible banner + updateUser({ email }))

**UI hint**: yes

---

### Phase 2: Trip + Member Management
**Goal**: Authenticated users can create a trip, share an invite link, and manage the member list — the container that all content will live in.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TRIP-01, TRIP-02, TRIP-03, TRIP-04, TRIP-05, TRIP-06, TRIP-07, TRIP-08, TRIP-09, UI-05
**Success Criteria** (what must be TRUE):
  1. User creates a trip with name, start/end dates, and optional description; trip appears in their trip list immediately
  2. Creator copies a shareable invite link; any person with the link joins the trip (after auth or anonymous join from Phase 1)
  3. All members can see the member list with names and avatars/initials; creator can remove members and members can leave
  4. Creator edits trip name, dates, or description and changes are reflected instantly for all members
  5. Trip dates display in Spanish day-month format (`Intl.DateTimeFormat('es-MX')`) consistently across all views
**Plans**: TBD
**UI hint**: yes

---

### Phase 3: Document Vault + PWA Offline
**Goal**: Members can upload travel documents, view them inline from anywhere in the trip, and open any previously-viewed document even with airplane mode enabled — this is the core value proposition.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08, DOCS-09, DOCS-10, PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, PWA-06, UI-04
**Success Criteria** (what must be TRUE):
  1. Member uploads a 5 MB PDF boarding pass from their phone camera roll; file goes directly to Supabase Storage via signed URL (never through Next.js); upload shows progress and completes without error
  2. All members see the uploaded document organized by category; any member opens it inline (PDF renders, image is zoomable) without downloading to a separate app
  3. Member opens a document while online, enables airplane mode, closes and reopens the app — the document loads instantly from IndexedDB with no network request
  4. A document with a QR code shows a "Mostrar QR" button; tapping it opens the QR fullscreen with screen brightness at maximum
  5. App is installable to iOS Home Screen; after install, `navigator.storage.persist()` is requested; a "Nueva versión disponible" banner appears when the service worker updates; an online/offline indicator is visible at all times
**Plans**: TBD
**UI hint**: yes

---

### Phase 4: Itinerary + Realtime
**Goal**: All group members share a live, chronological trip timeline — they can add, edit, and attach documents to events, and see each other's changes in real time.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05
**Success Criteria** (what must be TRUE):
  1. Member adds an itinerary item with title, date, start time, optional end time, free-text location, and notes; it appears immediately in the day-grouped chronological view
  2. Any member edits or deletes an itinerary item; the change appears on all other connected members' screens within 5 seconds (via Supabase Realtime `postgres_changes`)
  3. An itinerary item can reference one or more vault documents (e.g., a flight event links to the boarding pass PDF) with a visible attachment chip
**Plans**: TBD
**UI hint**: yes

---

### Phase 5: Polish + Real-device QA
**Goal**: The app survives real-world conditions — a 7-day-old iOS install in airplane mode, a cross-app magic link flow, and a 5 MB PDF upload on a degraded mobile connection — and the visual design delivers the vibrant, non-corporate Spotify/Duolingo energy the product targets.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: (no new v1 requirements — this phase verifies and hardens all prior phases)
**Success Criteria** (what must be TRUE):
  1. Real-device test: developer opens the app on an iPhone that has not been opened for 8+ days (simulated via date change or second device), enables airplane mode, and all previously-viewed documents load from IndexedDB — vault is not empty
  2. Cross-app auth test: magic link email opened in Gmail app (Chrome) while the invite was received in Safari — auth succeeds or a clear Spanish error with recovery action is shown
  3. Upload stress test: 5 MB PDF uploaded on a throttled (3G) connection that drops mid-upload — no silent failure; user sees an actionable Spanish error and can retry
  4. Visual design review: UI achieves vibrant, saturated palette with custom Tailwind `@theme` tokens; all empty states have illustrated guidance; no default gray Tailwind components visible
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 4/5 | In Progress|  |
| 2. Trip + Member Management | 0/? | Not started | - |
| 3. Document Vault + PWA Offline | 0/? | Not started | - |
| 4. Itinerary + Realtime | 0/? | Not started | - |
| 5. Polish + Real-device QA | 0/? | Not started | - |

---

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| INFRA-01 | Phase 1 |
| INFRA-02 | Phase 1 |
| INFRA-03 | Phase 1 |
| INFRA-04 | Phase 1 |
| INFRA-05 | Phase 1 |
| INFRA-06 | Phase 1 |
| INFRA-07 | Phase 1 |
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 1 |
| AUTH-05 | Phase 1 |
| AUTH-06 | Phase 1 |
| UI-01 | Phase 1 |
| UI-02 | Phase 1 |
| UI-03 | Phase 1 |
| TRIP-01 | Phase 2 |
| TRIP-02 | Phase 2 |
| TRIP-03 | Phase 2 |
| TRIP-04 | Phase 2 |
| TRIP-05 | Phase 2 |
| TRIP-06 | Phase 2 |
| TRIP-07 | Phase 2 |
| TRIP-08 | Phase 2 |
| TRIP-09 | Phase 2 |
| UI-05 | Phase 2 |
| DOCS-01 | Phase 3 |
| DOCS-02 | Phase 3 |
| DOCS-03 | Phase 3 |
| DOCS-04 | Phase 3 |
| DOCS-05 | Phase 3 |
| DOCS-06 | Phase 3 |
| DOCS-07 | Phase 3 |
| DOCS-08 | Phase 3 |
| DOCS-09 | Phase 3 |
| DOCS-10 | Phase 3 |
| PWA-01 | Phase 3 |
| PWA-02 | Phase 3 |
| PWA-03 | Phase 3 |
| PWA-04 | Phase 3 |
| PWA-05 | Phase 3 |
| PWA-06 | Phase 3 |
| UI-04 | Phase 3 |
| ITIN-01 | Phase 4 |
| ITIN-02 | Phase 4 |
| ITIN-03 | Phase 4 |
| ITIN-04 | Phase 4 |
| ITIN-05 | Phase 4 |

**Total v1 requirements: 48**
**Mapped: 48/48**
**Orphaned: 0**

> Note: UI-01..05 are cross-cutting. Each is assigned to the phase where it first ships in a user-visible way. All subsequent phases inherit those conventions — they are not re-implemented, just applied.

> Phase 5 carries no new requirements — it is a hardening and QA gate that verifies the observable outcomes of Phases 1–4 survive real-world conditions before the trip departs.

---

*Roadmap created: 2026-05-29*
*Milestone: v1 — before next trip*
