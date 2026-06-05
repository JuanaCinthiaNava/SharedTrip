# ROADMAP: SharedTrip v1

**Milestone:** v1 — Functional before the next real trip
**Deadline:** < 1 month from 2026-05-29
**Granularity:** Coarse (6 phases — 5 v1-core + 1 deferred email/accounts phase)
**Coverage:** 48/48 v1 requirements mapped (AUTH-01/02/06 deferred to Phase 6)

---

## Phases

- [x] **Phase 1: Foundation + Auth** — Deployed shell, typed-invite-code anonymous join verified on a real iPhone, RLS locked down, keep-alive active, i18n dictionary in place. **Re-scoped 2026-06-01** (magic-link → typed invite code; magic-link/email deferred to Phase 6) and **re-scope shipped + verified 2026-06-02** (plans 01-08/01-09; 11/11 device UAT passed — see `01-HUMAN-UAT.md`). (completed 2026-06-02)
- [ ] **Phase 2: Trip + Member Management** — Create trip, generate invite code, join as member, view/manage member list, edit/archive trip
- [ ] **Phase 3: Document Vault + PWA Offline** — Upload, view, offline cache, QR fullscreen, install prompt — the core value ships here
- [ ] **Phase 4: Itinerary + Realtime** — Collaborative chronological timeline with live updates, doc-to-event linking
- [ ] **Phase 5: Polish + Real-device QA** — iOS Safari hardening, performance, UI completeness before departure
- [ ] **Phase 6: Cuentas y Email (diferido)** — Magic-link / OTP login, account recovery for anonymous users, and invites to arbitrary inboxes — deferred out of v1 core; needs a verified email domain

---

## Phase Details

### Phase 1: Foundation + Auth

**Goal**: Any user — including a friend with no account — can open the app on a real iPhone, join a trip by typing a short invite code (e.g. `MARR-4F9K`), set a display name, and hold an anonymous session that persists across browser restarts.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, AUTH-03, AUTH-04, AUTH-05, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):

  1. Developer deploys to Vercel and the app loads on a real iPhone via HTTPS with a valid domain
  2. A person opens the app, types a short invite code (no email, no login), gets an anonymous Supabase session, sees themselves as a member, and sets a display name
  3. The anonymous session persists across browser restarts (membership preserved); the user can sign out from any screen
  4. A GitHub Actions cron pings Supabase every 3 days; all UI strings are served from `es.ts` with no hardcoded English visible

> **Re-scope note (2026-06-01):** magic-link/email entry (AUTH-01, AUTH-02) and anonymous→account email upgrade (AUTH-06) were moved to **Phase 6**. Original criterion "request a magic link …" and "upgrade by adding email …" are deferred. Entry is now a typed invite code (anonymous). The originally-built magic-link code (plan 01-03, parts of 01-05) is superseded by the re-scope — see `.planning/todos/pending/rescope-phase-01-invite-code.md` and `invite-code-schema.md`.
**Plans**: 9 plans built (5 original + 2 gap closure + 2 re-scope to invite-code entry).
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold Next.js 16 + Tailwind v4 + shadcn + Tropical Sunset palette + welcome slice + Vercel deploy
- [x] 01-06-PLAN.md — Gap closure (UAT Test 5): SECURITY DEFINER get_trip_id_by_invite_token fn + joinTrip RPC — fixes anonymous-join RLS chicken-and-egg
- [x] 01-07-PLAN.md — Gap closure (UAT Test 3): enable live Resend SMTP + verified sender + raised email rate limit — fixes magic-link 429
- [x] 01-08-PLAN.md — Re-scope data layer: add trips.invite_code (NOT NULL UNIQUE) + get_trip_id_by_invite_code SECURITY DEFINER resolver + seed code TEST-AB12 + types regen (AUTH-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Database schema (6 tables + RLS + is_trip_member + storage RLS) + profile autocreate trigger + seed test trip + GitHub Actions keep-alive cron
- [x] 01-03-PLAN.md — Magic link auth vertical slice (@supabase/ssr factories + middleware + signInWithOtp Server Action + /auth/callback + Resend SMTP)
- [x] 01-09-PLAN.md — Re-scope entry slice: typed invite-code welcome form + joinTripByCode + /join/[code] route; remove magic-link (sendMagicLink, /auth/callback, /auth/check-email, MagicLinkForm); defer D-12 email banner (AUTH-05) — code complete 2026-06-03; real-device UAT PENDING

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Trip shell (bottom tab bar + top header + trip switcher) + Perfil tab (display name editor + sign-out) + PWA manifest + avatar generator

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-05-PLAN.md — Anonymous join + upgrade vertical slice (/join/[token] + signInAnonymously + Sin cuenta pill + dismissible banner + updateUser({ email }))

**UI hint**: yes

---

### Phase 2: Trip + Member Management

**Goal**: Users can create a trip (anonymously), share its invite code, and manage the member list — the container that all content will live in. Trip creation generates the hybrid `invite_code` (see `.planning/todos/pending/invite-code-schema.md`).
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TRIP-01, TRIP-02, TRIP-03, TRIP-04, TRIP-05, TRIP-06, TRIP-07, TRIP-08, TRIP-09, UI-05
**Success Criteria** (what must be TRUE):

  1. User creates a trip with name, start/end dates, and optional description; trip appears in their trip list immediately with a generated invite code
  2. Creator shares the trip's invite code; any person who types it joins the trip (anonymous join from Phase 1)
  3. All members can see the member list with names and avatars/initials; creator can remove members and members can leave
  4. Creator edits trip name, dates, or description; changes reflect immediately for the editor and for all other members on their next view/navigation (via revalidatePath + router.refresh). Live push (Supabase Realtime) deferred to Phase 4 — confirmed 2026-06-05 that next-view freshness satisfies v1.
  5. Trip dates display in Spanish day-month format (`Intl.DateTimeFormat('es-MX')`) consistently across all views

**Plans**: 5 plans across 4 waves.
Plans:
**Wave 0** *(shared foundation)*
- [ ] 02-01-PLAN.md — invite_code generator + es-MX date helper + es.ts trip/members/invite namespaces + shadcn calendar/textarea

**Wave 1**
- [ ] 02-02-PLAN.md — Create-trip slice: two-choice welcome + /trips/new route + createTrip service-role action + invite_code + creator-as-admin (lands creator inside the trip)

**Wave 2** *(blocked on Wave 1)*
- [ ] 02-03-PLAN.md — Member-list + invite-share slice: Gente member list + role badges + invite card copy + wired trip switcher create button

**Wave 3** *(blocked on Wave 2 / Wave 1)*
- [ ] 02-04-PLAN.md — Member management slice: removeMember + leaveTrip + inline AlertDialog confirms
- [ ] 02-05-PLAN.md — Trip edit + delete slice: updateTrip/deleteTrip + EditTripSheet (CreateTripForm reuse) + type-name-to-delete dialog

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

### Phase 6: Cuentas y Email (diferido)

**Goal**: An anonymous user can attach an email to recover/persist their account across devices, and trip invites can be sent to arbitrary inboxes — restoring the magic-link/OTP capability that was deferred out of v1 core.
**Mode:** mvp
**Depends on**: Phase 1 (auth foundation) — independent of Phases 2–5; sequenced last by priority
**Requirements**: AUTH-01, AUTH-02, AUTH-06
**Trigger**: After v1 core ships, OR when a custom sending domain is verified in Resend (the hard blocker — `onboarding@resend.dev` only delivers to the account owner). See seed `.planning/seeds/email-account-recovery.md`.
**Success Criteria** (what must be TRUE):

  1. A user can request a sign-in email and authenticate via a **6-digit OTP code** (scanner-proof — survives Microsoft Safe Links, which consumes one-time link tokens); the email subject is unique per request
  2. An existing anonymous user attaches their email and keeps all trip memberships (account recovery / cross-device persistence)
  3. With a verified custom domain, invite/auth emails are delivered to arbitrary (non-owner) inboxes

**Design constraints learned in v1** (see seed + `01-07-SUMMARY.md`): prefer OTP-code entry over click-the-link (Safe Links pre-consume single-use links); the PKCE `/auth/callback` cookie flow is fragile cross-browser on mobile.
**Plans**: TBD (run `/gsd-plan-phase 6`)
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 9/9 | All plans code-complete; real-device UAT pending (run vercel --prod --force + 8-step iPhone test) | 2026-06-03 |
| 2. Trip + Member Management | 0/5 | Planned (5 plans, 4 waves) | - |
| 3. Document Vault + PWA Offline | 0/? | Not started | - |
| 4. Itinerary + Realtime | 0/? | Not started | - |
| 5. Polish + Real-device QA | 0/? | Not started | - |
| 6. Cuentas y Email (diferido) | 0/? | Deferred | - |

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
| AUTH-01 | Phase 6 (deferred) |
| AUTH-02 | Phase 6 (deferred) |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 1 |
| AUTH-05 | Phase 1 |
| AUTH-06 | Phase 6 (deferred) |
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

> Phase 6 (email/accounts) is deferred OUT of the v1-core dependency chain. Its requirements (AUTH-01, AUTH-02, AUTH-06) were originally in Phase 1 and are reassigned here; v1 ships without them.

---

*Roadmap created: 2026-05-29*
*Milestone: v1 — before next trip*
