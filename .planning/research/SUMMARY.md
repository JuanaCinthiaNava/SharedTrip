# Project Research Summary

**Project:** SharedTrip
**Domain:** Group trip PWA — offline-first document vault, magic link auth, real-time collaboration
**Researched:** 2026-05-29
**Confidence:** HIGH

---

## Executive Summary

SharedTrip is a Spanish-first PWA solving a specific, well-defined pain point: a group of friends cannot reliably access their travel documents (boarding passes, hotel confirmations, reservation QR codes) at the moment they need them most — airports, transit, spotty roaming. No existing competitor combines frictionless group invite (link only, no download, no account required), offline-first document access, and a shared itinerary in a single mobile-first product aimed at Spanish-speaking friend groups. The right approach is a thin full-stack PWA with Supabase as the sole backend — one platform covers auth, database, file storage, and realtime with a verified $0/month footprint at personal-circle scale.

The recommended stack is settled and well-evidenced: Next.js 16 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui on the frontend, Supabase (Auth + PostgreSQL + Storage + Realtime) as the backend, Serwist for the service worker, and Dexie.js for the offline IndexedDB layer. This is the only combination that handles magic link auth, direct-to-storage file uploads bypassing Vercel's 4.5MB body limit, anonymous-first group joins, and verified offline document access — all on the free tier. The architecture has a strict build-order dependency chain: infrastructure must precede auth, auth must precede trip creation, and trip creation must precede the document vault.

The most dangerous risk for this project is not technical: it is shipping too late. The deadline is the next real trip (under 1 month from 2026-05-29). The v1 feature set defined in PROJECT.md is the law — the document vault plus basic itinerary is all that must ship. Three platform-level gotchas also demand immediate attention: iOS Safari silently evicts IndexedDB storage after 7 days without a Home Screen install; Supabase RLS is off by default and a single missed `ENABLE ROW LEVEL SECURITY` exposes all trip documents publicly; and file uploads routed through a Next.js Server Action will silently fail for any PDF over 1MB. All three must be addressed in Phase 1 setup, not discovered in testing.

---

## Key Findings

### Recommended Stack

One choice per layer — no menus, no alternatives for v1.

**Core technologies:**
- **Next.js 16 (App Router):** Full-stack React framework — built-in PWA manifest support, Server Actions for secure auth operations, largest ecosystem for a solo dev under deadline. Pages Router is deprecated.
- **TypeScript 5.x:** Type safety across full stack — Supabase generates types from schema; catches shape mismatches without a second pair of eyes.
- **Tailwind CSS v4.3:** Utility-first CSS — CSS-first config (no JS config file), 5x faster builds. Required because shadcn/ui v4 components depend on it.
- **shadcn/ui (v4-compatible):** Component library — CLI copies source into project (you own it), Radix UI accessibility primitives, achieves Spotify/Duolingo visual energy via `@theme` tokens.
- **Supabase (JS client ^2.x + @supabase/ssr):** Single BaaS platform — PostgreSQL, magic link auth, file storage (1GB free), realtime subscriptions, Row Level Security. Free tier verified at $0 for <10 users.
- **Serwist (@serwist/next):** PWA service worker — the only maintained next-pwa successor compatible with Next.js 16 Turbopack. `next-pwa` is broken with Turbopack and unmaintained.
- **Dexie.js (^4.4.2):** IndexedDB wrapper — caches document blobs locally for offline access; `useLiveQuery` hook for reactive rendering from local store. Required for the airport use case.

**Critical version warnings:**
- Do NOT use `next-pwa` (unmaintained, broken with Next.js 16 Turbopack). Use `@serwist/next`.
- Do NOT use `@supabase/auth-helpers-nextjs` (deprecated). Use `@supabase/ssr`.
- Tailwind v4 requires CSS-first config — no `tailwind.config.js`; use `@import "tailwindcss"` in `globals.css`.

**Monthly cost at personal-circle scale: $0.** Supabase free tier covers 500MB DB, 1GB storage, 50K MAU. Vercel Hobby covers 100GB bandwidth, 1M invocations.

### Expected Features

**Must have for v1 (before the trip):**
- Trip creation (name, dates, description) — the container everything lives in
- Magic link invite via shareable link — frictionless group join, no install, no signup required
- Document vault: upload PDF/image, view inline, label by name, organized by trip
- Offline document access — the #1 pain point; if this fails, the product fails
- Itinerary: add/edit/delete events with date, time, place; chronological grouped list
- QR code full-screen display — zero-cost feature, high moment-of-need value; bump to v1
- Spanish UI throughout, mobile-first responsive, PWA installable on home screen

**Should have in v1 (high value, low cost — add if capacity allows):**
- Camera/gallery upload shortcut (`<input capture="environment">`)
- Document category tags (Vuelo / Hotel / Actividad / Otro)
- "Next up" event highlight in itinerary

**Defer to v1.5 (after first trip validates the vault):**
- Expense splitting: log expenses, balances, settle-up suggestion
- Multi-currency support
- Offline expense logging

**Defer to v2+:**
- Map with pins auto-populated from itinerary places
- Document-to-event linking in itinerary
- View-only link tier (no account required)

**Never build:**
- In-app chat — WhatsApp owns this for Spanish-speaking groups; reinventing it is pure scope creep
- In-app payments — financial licensing, PCI compliance; out of scope for a personal project
- Real-time location sharing — privacy surface too large
- Email auto-parse (TripIt-style) — OAuth email access + privacy risk; manual upload is right default

### Architecture Approach

The architecture is a two-tier system: a Next.js PWA client (with a service worker and IndexedDB offline layer) talking directly to Supabase BaaS via the JS SDK — there is no custom API server. All authorization lives in Postgres RLS policies, not application code. Server Actions are the only place sensitive keys or signed URL generation occur. Files go directly from browser to Supabase Storage via short-lived signed URLs (bypassing Vercel's 4.5MB body limit entirely). The offline layer is two-part: Serwist precaches the app shell, Dexie.js caches document blobs in IndexedDB on first open.

**Major components:**
1. **Next.js App Router** — UI rendering, routing, Server Actions as security boundary (signed URL generation, invite token creation, OTP verification)
2. **Supabase Auth + PostgreSQL + RLS** — magic link OTP, anonymous sign-in for invited members, all data with row-level access control enforced at DB layer
3. **Supabase Storage** — PDFs and images under `trip-documents/{tripId}/` path structure; RLS on `storage.objects` enforces trip membership via `storage.foldername()`
4. **Serwist (Service Worker)** — app shell precache (cache-first), Supabase Storage URLs (cache-first, 7-day TTL), Supabase REST API (network-first with 3s timeout)
5. **Dexie.js (IndexedDB)** — document blob store (keyed by doc ID), trip metadata cache, offline mutation queue for itinerary edits
6. **Supabase Realtime** — `postgres_changes` on `itinerary_items` table delivers live updates to all group members (enhancement, not a blocker)

**Auth pattern:** Anonymous-first join. Invited users get an anonymous Supabase session immediately on opening `/join/{invite_token}` — no email required. They can see and contribute right away. Later they can upgrade to permanent access by adding their email (anonymous user promoted via `supabase.auth.updateUser({ email })`). This eliminates the "create an account to see the ticket" friction that kills group adoption.

**Key data model (v1):**
- `trips` (id, name, dates, created_by, invite_token)
- `trip_members` (trip_id, user_id, role) — composite PK
- `documents` (id, trip_id, name, file_path, file_type, file_size)
- `itinerary_items` (id, trip_id, title, location, start_time, end_time)

### Critical Pitfalls

The 5 pitfalls that will break v1 if not addressed in Phase 1:

1. **iOS Safari 7-day storage eviction** — IndexedDB and Cache API are wiped on iOS if the app is not opened for 7 days AND is not added to Home Screen. A user uploads their boarding pass Monday, opens the app Friday at the airport (9 days later), vault is empty. Fix: call `navigator.storage.persist()` immediately after PWA install; drive Home Screen install aggressively at onboarding; re-cache documents on every launch (not just first); store all metadata in Supabase so re-download is automatic.

2. **Supabase RLS disabled by default — data fully exposed** — Every new Supabase table starts with RLS off. One missed `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` means all users' boarding passes and reservation codes are readable via the anon key (which is public in client JS). CVE-2025-48757 documented this exact mistake in 10.3% of Supabase apps analyzed. Fix: enable RLS in the same migration that creates the table, never later. Test from the client SDK as a second user, not from the SQL editor (which bypasses RLS).

3. **File uploads through Next.js Server Actions fail for real PDFs** — Next.js Server Actions have a 1MB request body limit. A boarding pass PDF is 1-5MB. Fix: generate a signed upload URL in the Server Action, return it to the browser, upload directly from browser to Supabase Storage. File bytes never touch Next.js. This is the only correct architecture — validate it works end-to-end on a 5MB PDF on a 3G connection before v1 ships.

4. **Supabase free tier pauses after 7 days of inactivity — 30-second cold start** — A user opens SharedTrip at the airport, the app stalls for 30 seconds on the first API call. The offline cache mitigates this for cached documents but not for anything requiring a fresh API call. Fix: set up a free cron job (cron-job.org) pinging the Supabase health endpoint every 3 days. 5 minutes of setup prevents a critical UX failure.

5. **Magic link Gmail threading causes expired link clicks** — When a user requests multiple magic links (common: "it didn't work, send again"), Gmail groups all emails into one thread. The user clicks the oldest (expired) link. Auth fails with a confusing error. Fix: make the email subject unique per request (add a timestamp: "Tu enlace de acceso — 14:32"); include explicit copy in the email body stating which link to use and that it expires in 15 minutes.

---

## Implications for Roadmap

Based on research, the architecture creates a hard dependency chain. There is no flexibility in the build order for the first three phases.

### Phase 1: Infrastructure + Auth Foundation

**Rationale:** Nothing else can be built until auth, the database schema, and RLS policies exist. The invite link and anonymous join flow is the single most important UX decision — it must be validated working on a real iPhone before any content features are built on top of it.

**Delivers:** A working Next.js + Supabase project deployed to Vercel; magic link auth end-to-end; anonymous join via invite token; session middleware; Supabase keep-alive cron; PWA manifest and Serwist service worker skeleton; `es.ts` string dictionary; RLS policies for all v1 tables.

**Addresses:** Trip creation (shell), magic link invite, Spanish UI, PWA installable

**Avoids:** RLS-off data exposure (Pitfall 2), Supabase pause cold start (Pitfall 4), Gmail magic link threading (Pitfall 5), magic link same-browser failure on iOS (must be tested here), iOS persistent storage not requested (Pitfall 1 prevention starts here), i18n retrofit debt

**Done when:** A real group member (not the developer) can receive an invite link on their iPhone, tap it, open the app as an anonymous user, and see the trip — without creating an account.

### Phase 2: Document Vault + PWA Offline

**Rationale:** This is the core value proposition and the reason the product exists. Everything in Phase 1 was infrastructure to enable this. The offline caching layer (Serwist + Dexie) must be production-ready here, not retrofitted.

**Delivers:** Upload PDF/image (camera + file picker), view inline, label, category tag, QR full-screen display, offline access via IndexedDB blob cache, upload progress UI, client-side EXIF rotation correction, image compression before upload, graceful offline-upload block with clear Spanish messaging.

**Addresses:** Document vault (all table stakes + differentiators), offline document access, camera/gallery upload, QR full-screen

**Avoids:** Signed URL upload pattern — never proxying files through Next.js (Pitfall 3), iOS storage eviction (Pitfall 1 — persist() + re-cache on launch), egress quota burnout via aggressive IndexedDB caching, EXIF rotation breaking QR scannability, silent offline upload failures

**Done when:** A developer uploads a 5MB PDF on a real iPhone, closes the app, enables airplane mode, reopens the app, and the document loads from IndexedDB without a network request.

### Phase 3: Itinerary + Realtime

**Rationale:** The itinerary is table stakes per FEATURES.md but is unblocked (not blocking) — the document vault must ship first since it is the primary pain point. Realtime is an enhancement; polling is an acceptable fallback if time is tight. This phase can ship without realtime if the deadline requires it.

**Delivers:** Add/edit/delete itinerary events (title, date/time, place), chronological day-grouped list, "next up" highlight, offline itinerary cache in IndexedDB, Supabase Realtime subscription for live updates.

**Addresses:** Itinerary CRUD, day-grouped view, "next up" event, offline itinerary access

**Avoids:** Realtime as a deadline risk — scope to polling-first if Phase 2 runs long; defer Realtime to a follow-on sprint within Phase 3

**Done when:** All group members on their phones can see an itinerary update from one member within 5 seconds (or via manual refresh if realtime is deferred).

### Phase 4: v1.5 — Expense Splitting

**Rationale:** Deferred until after the first real trip validates that the vault and itinerary are used. Expense splitting is independent of the document vault and can be built after real-world validation confirms the demand. The data model (expenses table, split_between array) should be defined in Phase 1 migrations to avoid a schema migration mid-v1.5.

**Delivers:** Log expense (amount, payer, split), running balances per member, settle-up suggestion (greedy debt simplification), multi-currency with stored exchange rate.

**Addresses:** v1.5 expense features from PROJECT.md

**Avoids:** Building this before the vault works — scope creep risk identified in Pitfall 12

### Phase 5: v2 — Map

**Rationale:** Correctly deferred. The map has nothing meaningful to show until the itinerary has accumulated place data from a real trip. Build only after the itinerary's place field has real data and users express geographic orientation needs.

**Delivers:** Mapbox/Leaflet embed with pins auto-geocoded from itinerary place text, pin-to-event linking.

---

### Phase Ordering Rationale

- **Auth before everything else** because trip ownership requires identity. An anonymous session is still identity — but it must exist before any trip-scoped record can be written with a `created_by` or `user_id` foreign key.
- **Document vault before itinerary** because the vault is the primary pain point (PROJECT.md Core Value) and the one non-negotiable feature. Itinerary is high-value but is table stakes, not the differentiator.
- **PWA offline layer in Phase 2, not later** because retrofitting Serwist caching strategies and IndexedDB blob caching after the upload flow is built requires rewriting the upload pipeline. These are design decisions, not optimizations.
- **Expenses deferred to Phase 4** because they depend on real trip feedback to validate the feature design, and building them before Phase 2/3 is validated is the most dangerous scope creep pattern (Pitfall 12).
- **The `expenses` and `itinerary_items` tables should be created in Phase 1 migrations** even if the features ship later — avoids mid-project schema changes that require RLS migration updates.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Document Vault):** The offline blob caching strategy (Serwist runtime cache vs. Dexie IndexedDB) has nuance around signed URL expiry — a cached Supabase Storage signed URL will expire before the 7-day service worker TTL. The correct pattern is to cache the blob bytes in Dexie, not the signed URL. Verify the exact Dexie + Serwist integration pattern before implementation.
- **Phase 3 (Realtime):** Supabase Realtime `postgres_changes` requires RLS SELECT policy to pass for the subscribed user's JWT — if RLS is set up incorrectly, realtime events will silently not deliver. Verify the policy + realtime interaction in the Supabase dashboard before wiring the React hook.

**Phases with standard, well-documented patterns (skip extra research):**
- **Phase 1 (Auth):** Supabase magic link + anonymous sign-in + `@supabase/ssr` with Next.js App Router is fully documented with official guides. The ARCHITECTURE.md has the exact flow and code snippets.
- **Phase 4 (Expenses):** Debt simplification algorithm (greedy) is a solved CS problem. Splitwise's pattern is well-documented. No novel research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core choices verified against official docs (Next.js, Supabase, Serwist, Tailwind v4). Version compatibility table in STACK.md cross-referenced. |
| Features | MEDIUM-HIGH | Competitor analysis from official sources + review sites. Feature gaps are well-evidenced. Complexity estimates (S/M/L) are researcher judgment, not benchmarks. |
| Architecture | HIGH | Supabase, Next.js App Router, Serwist, and RLS patterns verified against official documentation. Data model is standard relational design with no novel patterns. |
| Pitfalls | HIGH (iOS/RLS/upload), MEDIUM (scope/i18n) | iOS 7-day eviction and RLS-off risk are documented with CVE references and official Safari specs. Scope creep pitfall is process advice, not technical research. |

**Overall confidence: HIGH**

### Gaps to Address

- **Signed URL caching strategy:** Supabase Storage signed URLs expire (default 1 hour). If a service worker caches a signed URL and serves it offline after expiry, the request fails. Confirm during Phase 2 implementation that the correct approach is caching the blob bytes (via Dexie) and not the URL itself.
- **Anonymous user identity persistence on iOS:** Supabase anonymous sessions are stored in localStorage. iOS Safari may clear localStorage under storage pressure. Confirm whether the anonymous session survives the 7-day ITP cycle if the user has NOT added to Home Screen — and whether this requires a fallback (cookie-based session storage).
- **Email deliverability for magic links:** Supabase's built-in SMTP has known deliverability issues (spam folder, rate limits). If the first user test shows magic link emails not arriving, switch to Resend (free tier: 3K emails/month) via Supabase's custom SMTP setting. Plan for this contingency in Phase 1.
- **Supabase Storage RLS with `storage.foldername()`:** The folder-based RLS pattern requires the tripId to be a valid UUID and the folder path to follow `{tripId}/{filename}` exactly. Verify the path construction matches RLS expectations in a local Supabase test before Phase 2 ships.

---

## Sources

### Primary (HIGH confidence — official documentation)
- [Next.js 16 Official PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — Serwist confirmed as official offline recommendation
- [Supabase Auth: Magic Link Docs](https://supabase.com/docs/guides/auth/auth-email-passwordless) — magic link + OTP flow confirmed
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) — anonymous-first join pattern confirmed
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy patterns verified
- [Supabase Storage: Upload to Signed URL](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl) — direct browser upload pattern confirmed
- [Supabase SSR + Next.js Docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` replacing deprecated auth-helpers confirmed
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first architecture confirmed
- [Serwist Getting Started](https://serwist.pages.dev/docs/next/getting-started) — next-pwa successor for Next.js 16 confirmed
- [Vercel Pricing](https://vercel.com/pricing) — free tier limits verified
- [Supabase Pricing](https://supabase.com/pricing) — free tier limits verified

### Secondary (MEDIUM confidence — community sources, multiple agree)
- [Supabase RLS: CVE-2025-48757 analysis](https://vibeappscanner.com/supabase-row-level-security) — RLS-off risk quantified (10.3% of apps analyzed)
- [PWA iOS Limitations 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS 7-day eviction behavior documented
- [Offline-First PWA with Serwist — DEV Community](https://dev.to/sukechris/building-offline-apps-with-nextjs-and-serwist-2cbj) — Serwist + Next.js integration pattern
- [Supabase pause prevention via GitHub Actions](https://dev.to/jps27cse/how-to-prevent-your-supabase-project-database-from-being-paused-using-github-actions-3hel) — keep-alive workaround confirmed
- Competitor analysis: TripIt, Wanderlog, Splitwise, Polarsteps official sites + review aggregators

---

*Research completed: 2026-05-29*
*Ready for roadmap: yes*
