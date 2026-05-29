# Phase 1: Foundation + Auth - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the **deployed app shell + identity layer** that every later phase depends on. By the end of this phase, any user — including a fully anonymous friend — can open SharedTrip on a real iPhone via HTTPS, hold an authenticated session that survives a browser restart, and see a member list in a (placeholder) trip. The visual identity, navigation pattern, and i18n dictionary that ship here become the conventions every later phase inherits.

**In scope:**
- Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui project bootstrap, deployed to Vercel via custom domain
- Supabase project: PostgreSQL, Auth, Storage (`trip-documents` private bucket), Realtime
- Initial schema for `trips`, `trip_members`, `documents`, `itinerary_items`, `expenses` (last one empty, ready for v1.5) — all with RLS enabled in the same migration that creates them
- `is_trip_member(trip_id uuid) returns boolean SECURITY DEFINER` function consumed by all per-trip RLS policies
- Magic link auth via Resend (custom sender, Spanish copy, unique timestamped subject)
- `signInAnonymously()` flow for invitees + `updateUser({ email })` upgrade preserving trip membership
- Session persistence across browser restart (`@supabase/ssr` cookies)
- Bottom-tab app shell + dark "tropical sunset" palette via Tailwind v4 `@theme` tokens
- `es.ts` i18n dictionary (all UI strings live here — no hardcoded Spanish in JSX)
- GitHub Actions keep-alive cron pinging Supabase every 5 min
- Sign-out from any screen

**Out of scope (later phases):**
- Trip CRUD and invite-link generation → Phase 2
- Document upload, viewing, offline cache, QR fullscreen → Phase 3
- Itinerary + realtime → Phase 4
- iOS Safari hardening, real-device QA, polish → Phase 5
- Photo upload for avatars → v2

</domain>

<decisions>
## Implementation Decisions

### Magic link email experience
- **D-01:** SMTP provider is **Resend** (3K/mo free tier). Set up via Supabase custom SMTP. Domain must be one the dev controls — sender domain DNS (SPF / DKIM) must be configured before Phase 5 real-device testing.
- **D-02:** Sender identity is **personal** in the form `Cristian (SharedTrip) <cristian@{domain}>` — friend-circle product, not a transactional brand. Recognisable name beats branded `noreply@`.
- **D-03:** Subject template: `Acceso a tu viaje · HH:mm` where `HH:mm` is the request time in 24h format (`Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })`). The `·` + timestamp suffix is what defeats Gmail threading and tells the user which link is the freshest.
- **D-04:** Body tone is **branded & friendly** — single emoji, short Spanish copy, prominent CTA button. Skeleton:
  - Subject (above)
  - Body: "Hola 👋  Toca el botón para entrar a tu viaje en SharedTrip."
  - CTA button: "Entrar a SharedTrip" (coral background)
  - Footer line: "El enlace expira en 15 minutos. Si no lo solicitaste, ignora este correo."
  - No additional marketing copy, no signature image, no unsubscribe link (this is transactional auth, not marketing).

### Visual identity & app shell
- **D-05:** Palette is **Tropical Sunset, dark-mode default**. Defined as Tailwind v4 `@theme` tokens in `globals.css`:
  - `--color-primary: #FF6B6B` (coral) — CTAs, brand wordmark, primary buttons
  - `--color-accent: #3DCCC7` (teal) — links, secondary highlights, success states
  - `--color-secondary: #FFB627` (mango) — warnings/notices, "next up" highlights, callouts
  - `--color-bg: #0F1729` (midnight navy) — page background
  - `--color-surface: #1A2238` (one notch lighter than bg) — card/sheet surfaces
  - `--color-fg: #FAFAFA` (off-white) — primary text
  - `--color-fg-muted: #94A3B8` — secondary text, labels
  - No dark/light toggle in Phase 1 — dark is the only theme. Light-mode toggle deferred.
- **D-06:** Navigation pattern is a **bottom tab bar** with 4 tabs:
  1. **📄 Docs** — documents tab inside the active trip (Phase 3 fills this)
  2. **📅 Itin** — itinerary tab inside the active trip (Phase 4 fills this)
  3. **👥 Gente** — member list inside the active trip (Phase 2 fills this; Phase 1 ships an empty/placeholder)
  4. **🙋 Perfil** — current user's profile + sign-out + (later) upgrade banner CTA destination
  - Tabs scoped to the **active trip context** — the tab bar is hidden when no trip is selected (e.g., on the auth/welcome screen).
  - Active-tab indicator: coral underline + coral icon tint; inactive tabs use `--color-fg-muted`.
- **D-07:** Typography is **Inter** (variable font), self-hosted via `next/font/google` with `display: 'swap'`. Single family across the app. No accent / display font in Phase 1.
- **D-08:** Brand mark is **wordmark only** for Phase 1: the literal string `SharedTrip` rendered in `--color-primary` (coral), Inter italic, weight 600. No SVG glyph yet. The PWA icon (manifest) uses a coral square with white `S` until a real mark is commissioned in Phase 5.
- **D-09:** Multi-trip switching: the **trip name in the top header is a dropdown trigger**. Tapping it opens a sheet listing all the user's trips plus a "+ Crear nuevo viaje" entry at the bottom. No dedicated `/viajes` route, no trip list tab. (Phase 2 implements the create-trip action; Phase 1 ships the dropdown empty-state UI: "No tienes viajes todavía — pídele un link a quien te invitó o crea uno.")

### Anonymous-join → upgrade flow
- **D-10:** **First tap on `/join/{token}` lands the user directly inside the trip** — no welcome screen, no name prompt. The route handler calls `supabase.auth.signInAnonymously()` (if no session exists), inserts a `trip_members` row, and renders the trip. **Note:** the trip-creation + invite-token-generation logic itself lands in Phase 2; Phase 1 ships the route handler + anonymous sign-in wiring, validated against a manually-seeded token.
- **D-11:** A small **"Sin cuenta" pill** (mango background, navy text) appears next to the user avatar in the top header whenever the session is anonymous, so it's always discoverable that the account is provisional.
- **D-12:** The upgrade nudge is a **persistent, dismissible banner** at the top of the app (below header, above content). Copy: "Sin email guardado — agrega uno para no perder acceso." with a single CTA "Agregar email". Dismissal is session-scoped (re-appears next launch — anonymous status is high-stakes enough to keep nudging). Banner is hidden on the auth/welcome screen and once the user has an email.
- **D-13:** Upgrade form asks for **email only**. Submitting calls `supabase.auth.updateUser({ email })`, which sends a Supabase confirmation email. Show a Spanish toast: "Te enviamos un correo de confirmación a {email}. Toca el enlace para terminar." User stays signed in (anonymous → permanent) as soon as they click the confirmation link in a subsequent session.

### Profile & identity model
- **D-14:** Anonymous user default display name is an **auto-generated `{Adjective} {Animal}`** in Spanish (e.g., "Tucán Curioso", "Iguana Veloz", "Tortuga Sabia"). Generated client-side from a hard-coded list (one list each: ~30 adjectives + ~30 animals; seeded by the Supabase user id so the same anon user always gets the same name across sessions/devices until they change it).
- **D-15:** Avatar default is a **colored circle with the emoji that matches the animal in the auto-name** (🦜 Tucán, 🦎 Iguana, 🐢 Tortuga…). Background color picked deterministically from the palette set `{coral, teal, mango}` via hash of the user id. The emoji+color combo functions as a low-cost visual identity until photo upload arrives in v2. Trade-off accepted: cross-OS emoji rendering will differ slightly — we accept this for the "fun + on-brand" benefit.
- **D-16:** Only the **user themselves** can edit their own display name (from the Perfil tab). Trip creator cannot rename other members. If the auto-generated random names create real confusion during the first trip, revisit with creator-rename in Phase 5 polish.
- **D-17:** Identity model in the DB: store `display_name` and `avatar_seed` (`null` until customized) on a `profiles` table keyed by `auth.users.id`, *not* in `auth.users` metadata. RLS: any authenticated user (anon or permanent) can `SELECT` `profiles` rows for users they share a `trip_members` row with; only the user themselves can `UPDATE` their own row. The auto-name generator reads from `avatar_seed` if set, otherwise derives the name client-side from `auth.users.id` — so the name is stable per user but doesn't require a server round-trip on first render.

### Claude's Discretion
- Exact RLS policy SQL for each of the 5 tables — research RESEARCH.md will surface; planner picks the canonical pattern. Constraint: every policy MUST be in the same migration that creates the table, RLS MUST be enabled in that same migration (Pitfall #2 in the research SUMMARY).
- Exact `is_trip_member(trip_id)` function body — standard pattern: `SECURITY DEFINER`, `STABLE`, queries `trip_members` by `auth.uid()`.
- `es.ts` dictionary structure: flat vs. nested namespaces, typing pattern (planner's call — recommend type-safe `as const` + `keyof typeof`).
- GitHub Actions keep-alive cron: which Supabase endpoint to ping (must keep the DB warm, not just the auth service — recommend a no-op `SELECT 1` via the REST API against an unprivileged table or the Supabase `/rest/v1/?apikey=...` health endpoint).
- The exact list of adjectives + animals for the auto-name generator — planner can draft (~30 each, family-friendly, Spanish-LATAM neutral).
- Anonymous session storage on iOS: research SUMMARY flags this as a gap — planner should confirm cookie-based session storage via `@supabase/ssr` survives iOS Safari ITP without Home Screen install, OR document the fallback.
- Vercel env var hygiene: `SUPABASE_ANON_KEY` (public), `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`), `RESEND_API_KEY` (server-only).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level decisions (always read)
- `.planning/PROJECT.md` — Core value, constraints, what NOT to build
- `.planning/REQUIREMENTS.md` — All 48 v1 requirements with stable IDs (INFRA-01..07, AUTH-01..06, UI-01..03 are in this phase's scope)
- `.planning/ROADMAP.md` — Phase boundaries, success criteria, dependency chain
- `CLAUDE.md` — Locked stack (Next.js 16, Supabase, Tailwind v4, shadcn/ui v4, Serwist, Dexie), version compatibility matrix, "What NOT to Use" table

### Research artifacts (read all)
- `.planning/research/SUMMARY.md` — Executive summary, stack confidence, 5 critical pitfalls (RLS-off, iOS eviction, upload size, pause, Gmail threading)
- `.planning/research/STACK.md` — Version-pinned stack with installation order
- `.planning/research/ARCHITECTURE.md` — Two-tier client + Supabase architecture; data model; auth flow; RLS pattern
- `.planning/research/PITFALLS.md` — Phase-1-blocking pitfalls (numbers 1, 2, 4, 5 land here)
- `.planning/research/FEATURES.md` — Feature scope confirmation

### External documentation (cite when implementing)
- [Supabase Auth: Magic Link](https://supabase.com/docs/guides/auth/auth-email-passwordless) — confirmed: 1-hour default expiry, reduce to 15 min via dashboard
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) — the upgrade flow via `updateUser({ email })` is documented here
- [Supabase SSR + Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` is the only supported pattern; `@supabase/auth-helpers-nextjs` is deprecated
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — `is_trip_member` SECURITY DEFINER pattern is the canonical one for "are they a member of this trip"
- [Supabase Custom SMTP (Resend)](https://supabase.com/docs/guides/auth/auth-smtp) — sender domain DNS (SPF/DKIM) is required for non-spam delivery
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config via `@theme`, no `tailwind.config.js`
- [shadcn/ui v4 init](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 + React 19 init flow
- [Next.js 16 PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — Phase 3 will lean on this; Phase 1 ships the manifest only, no service worker yet (Serwist arrives in Phase 3 alongside the offline doc vault)

### Pitfalls that MUST be addressed in Phase 1 (from research SUMMARY)
- **Pitfall 2 — RLS off by default:** enable RLS in the SAME migration that creates each table, never later. Test from the client SDK as a second user, not from the SQL editor.
- **Pitfall 4 — Supabase free-tier 7-day pause:** GitHub Actions keep-alive cron every 5 min is INFRA-05 (REQUIREMENTS.md). 5 min interval is more aggressive than the 3-day suggestion in research; honour the requirement.
- **Pitfall 5 — Gmail threading:** the timestamped subject (D-03) is the fix; this lives in the Resend email template configuration.
- **Pitfall 1 (iOS eviction) — preparation only in Phase 1:** the actual `navigator.storage.persist()` call lands in Phase 3 when the first document is uploaded. Phase 1's PWA manifest must be Home-Screen-install-ready (correct icons, `display: standalone`, theme color matches `--color-bg`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None** — Phase 1 is greenfield. No existing components, hooks, or utilities to reuse. The codebase is empty except for `.planning/` documents and `CLAUDE.md`.

### Established Patterns
- **None from prior phases** (this is Phase 1). The patterns this phase establishes that downstream phases will inherit:
  - `es.ts` as the single source of truth for UI strings — no hardcoded Spanish in JSX components
  - `@theme` tokens in `globals.css` as the only color source — no hex codes in components
  - `@supabase/ssr` cookie-based session via shared `createClient` factories (`/lib/supabase/server.ts`, `/lib/supabase/client.ts`, `/lib/supabase/middleware.ts`) — every later phase imports from here
  - RLS-in-creation-migration pattern — every new table in Phase 2+ MUST enable RLS in the same SQL migration
  - Bottom-tab shell with trip-scoped routes (`/t/[tripId]/docs`, `/t/[tripId]/itin`, `/t/[tripId]/gente`, `/perfil`) — Phase 2/3/4 fill these tab routes

### Integration Points
- Phase 2 will write the first `trips` and `trip_members` rows against the schema and policies that land here.
- Phase 3 will use the `documents` table + `trip-documents` Storage bucket created here, and will add Serwist + Dexie on top of the PWA manifest shipped here.
- Phase 4 will use the `itinerary_items` table + the existing RLS function created here.

</code_context>

<specifics>
## Specific Ideas

- Spotify / Duolingo were referenced as the energy target. The chosen palette (D-05) leans Spotify-ish (dark, saturated) with a coral primary that's warmer than Spotify's green — closer to a "vacation app" tone than a "media app" tone.
- The animal-name + emoji-avatar (D-14, D-15) is intentionally playful to set the "this is a friend-group app, not a corporate tool" tone from the first second a user opens it.
- The "Sin cuenta" pill + persistent dismissible upgrade banner (D-11, D-12) is the explicit balance between "frictionless invite" (no signup wall) and "don't let them lose access on the day of the flight" (gentle nag).

</specifics>

<deferred>
## Deferred Ideas

These came up during discussion or are implied by decisions and belong in later phases — captured here so they're not lost.

- **Photo uploads for avatars** — v2. Emoji + colored circle is sufficient for v1.
- **Light-mode toggle** — Phase 5 polish or later. Dark is the only theme in Phase 1.
- **Custom SVG brand mark / logo** — Phase 5 polish. Wordmark + "S on coral square" PWA icon ships now.
- **Creator can rename members** — only revisit if real-trip testing shows the auto-generated names cause confusion. Phase 5 candidate.
- **Switch from Supabase built-in SMTP fallback to Resend** — N/A; we're starting on Resend (D-01).
- **Display-name + avatar collected during upgrade form** — explicitly rejected (D-13: email only). If real-trip testing shows users never customize the auto-name, revisit.
- **Dedicated `/viajes` trip-list route** — rejected in favour of header-dropdown switching (D-09). Revisit only if a user ends up in 5+ trips and finds the dropdown unwieldy.
- **Defer Resend to later** — rejected; deliverability of the magic link is critical to the friend-circle invite UX, so Resend is in scope from Phase 1.

</deferred>

---

*Phase: 01-Foundation+Auth*
*Context gathered: 2026-05-29*
