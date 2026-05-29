# Walking Skeleton — SharedTrip

**Phase:** 1
**Generated:** 2026-05-29

## Capability Proven End-to-End

A friend taps an invite link on their iPhone → they land inside a trip with an anonymous session (no signup wall) → they see a Spanish UI rendered from `es.ts` → and a separately registered user can request a magic link, click it from email, and end up in the same trip shell with a session that survives a browser restart.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.6 App Router (TypeScript, `src/` dir, `@/*` alias) | Locked by CLAUDE.md. App Router enables Server Actions for the auth boundary, built-in `app/manifest.ts` for PWA, and Vercel free-tier deploy without config. |
| Styling | Tailwind CSS v4.3 (CSS-first `@theme` tokens in `globals.css`) + shadcn/ui v4 | Locked by CLAUDE.md. No `tailwind.config.js`. shadcn copies component source into `src/components/ui/` so we own the code. All Tropical Sunset palette tokens live in `@theme inline`. |
| Data layer | Supabase Postgres + Row-Level Security on every table (`is_trip_member()` SECURITY DEFINER, STABLE, `search_path=public`) | Locked. RLS enabled in the SAME migration as the table (Pitfall #2). `(SELECT auth.uid())` form used in every policy (94% faster than bare `auth.uid()`). |
| Auth | Supabase Auth — magic link via Resend SMTP + anonymous sign-in. Session via `@supabase/ssr` cookie storage (NOT localStorage). | Magic link for permanent accounts (D-01..D-04), `signInAnonymously()` for frictionless invite (D-10). `getUser()` server-side (NOT `getSession()`). Cookie storage survives iOS ITP better than localStorage. |
| Auth keys | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new June-2025 format `sb_publishable_...`), server-only `SUPABASE_SECRET_KEY`, server-only `RESEND_API_KEY` | New Supabase key format is the default for projects created after June 2025. Service-role key NEVER `NEXT_PUBLIC_`. |
| Email subject + body (anti-Gmail-threading + freshness) | Resend SMTP via Supabase built-in email template; subject `Acceso a tu viaje · {{ .Token }}` (token fragment defeats Gmail threading); body includes a `Solicitado a las HH:mm` line as the user-facing freshness signal | D-03 revised 2026-05-29: split uniqueness (subject token) from readability (body timestamp). Eliminates the `admin.generateLink()` + Resend SDK ownership cost while still honoring the readability intent. No deferral. |
| Deployment target | Vercel Hobby (auto-deploy from GitHub main branch); custom domain configured before Phase 5 | Free tier covers MVP. `vercel.json` not required — convention-based. Preview deploys on every PR. |
| Directory layout | `src/app` (routes), `src/components/{ui,layout,auth,profile,common}`, `src/lib/{supabase,offline,utils}`, `src/i18n/es.ts`, `src/actions`, `src/types`, `supabase/migrations`, `.github/workflows` | Matches RESEARCH.md Pattern 2 ("Recommended Project Structure"). Every later phase fills these folders without renegotiating layout. |
| i18n | Single typed `src/i18n/es.ts` dictionary with `as const` + `export type EsKeys = typeof es`. ZERO hardcoded Spanish in JSX. | INFRA-07. i18n-ready without i18n library overhead. |
| Color tokens | `--color-bg` `#0F1729`, `--color-surface` `#1A2238`, `--color-primary` `#FF6B6B` (coral), `--color-accent` `#3DCCC7` (teal), `--color-secondary` `#FFB627` (mango), `--color-fg` `#FAFAFA`, `--color-fg-muted` `#94A3B8`, `--color-destructive` `#EF4444` | D-05 Tropical Sunset palette. Defined in `:root` + mapped to Tailwind utilities via `@theme inline`. Dark-mode-only in Phase 1 (no toggle). |
| Typography | Inter variable font, self-hosted via `next/font/google`, `display: 'swap'`. Only weights 400 and 700. Only sizes 14/16/20/28 px. | D-07 + UI-SPEC Typography section. |
| Identity model | Postgres `profiles` table keyed by `auth.users.id`, columns `display_name`, `avatar_seed`, `updated_at`. Auto-generated `{Adjective} {Animal}` name derived deterministically from user id when `avatar_seed` is null. | D-14, D-15, D-17. Avoids touching `auth.users.user_metadata`. |
| Keep-alive | GitHub Actions cron `*/5 * * * *` hitting `${SUPABASE_URL}/rest/v1/` with `apikey: ${PUBLISHABLE_KEY}`. | INFRA-05. ~720 min/mo, under the 2,000 min/mo free tier. |
| PWA | `app/manifest.ts` only (no service worker yet). Icons `192×192` and `512×512` (coral square + white S). `display: 'standalone'`, `lang: 'es'`. | Phase 1 ships manifest only; Serwist service worker arrives in Phase 3 to avoid mid-development caching issues. |

## Stack Touched in Phase 1

- [x] Project scaffold — `create-next-app` with TS + Tailwind v4 + App Router + `src/` + `@/*` alias; shadcn init; ESLint + Prettier + `prettier-plugin-tailwindcss`
- [x] Routing — `/`, `/auth/callback`, `/auth/check-email`, `/join/[token]`, `/t/[tripId]/{docs,itin,gente,perfil}`
- [x] Database — REAL WRITE: `INSERT INTO trip_members` on anonymous join. REAL READ: `SELECT trip` by `invite_token` on join; `SELECT profile` for display name in Perfil tab; `SELECT trips` in TripSwitcherSheet.
- [x] UI — REAL INTERACTION: magic link form submit → server action → Resend email; sign-out button in Perfil tab; tap "Sin cuenta" pill → opens upgrade sheet → submit email → `updateUser()`.
- [x] Deployment — Vercel Hobby, custom domain, env vars set, GitHub Actions keep-alive cron running every 5 min.

## Out of Scope (Deferred to Later Slices)

- Trip CRUD (`create / edit / archive trip`) — Phase 2. Phase 1 validates anonymous join against a **manually-seeded** `trips` row + invite token.
- Member-list UI populated with real members beyond self — Phase 2 (Gente tab empty state ships now).
- Document upload, view, offline cache, QR fullscreen — Phase 3 (Docs tab empty state ships now; `documents` table + `trip-documents` bucket + storage RLS ship now).
- Itinerary CRUD + Realtime — Phase 4 (Itin tab empty state ships now; `itinerary_items` table ships now).
- Serwist service worker + offline document caching via Dexie — Phase 3.
- `navigator.storage.persist()` call — Phase 3, triggered on first document upload.
- Display-name + avatar collection during upgrade form — explicitly rejected (D-13: email only).
- Light-mode toggle — Phase 5+.
- Custom SVG brand mark — Phase 5+.
- Creator-rename-other-members — Phase 5 candidate only if real-trip testing surfaces confusion.
- ~~Dynamic timestamp in email subject via `admin.generateLink()` + Resend SDK~~ — superseded by D-03 revision (2026-05-29): subject uses `{{ .Token }}` for uniqueness, body uses `Solicitado a las HH:mm` for readability. The `admin.generateLink()` route is no longer planned for Phase 5.
- iOS Safari PKCE same-browser hardening (OTP fallback field) — Phase 5.
- iOS `getUser()` first-load null retry — Phase 5 hardening.

## Subsequent Slice Plan

- **Phase 2:** Trip CRUD slice — create trip form → `INSERT INTO trips` → render in TripSwitcherSheet → invite link generation; Gente tab populated.
- **Phase 3:** Document Vault slice — upload form → signed URL → Supabase Storage → Dexie cache → offline read; Serwist service worker; PWA install prompt.
- **Phase 4:** Itinerary slice — create itinerary item → Postgres `INSERT` → Realtime `postgres_changes` broadcast → other members' screens update.
- **Phase 5:** Polish + real-device QA — iOS hardening, performance, visual completeness on real iPhone.
