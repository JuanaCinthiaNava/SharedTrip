# Phase 1: Foundation + Auth - Research

**Researched:** 2026-05-29
**Domain:** Next.js 16 App Router bootstrap + Supabase Auth (magic link + anonymous) + Tailwind v4 + shadcn/ui v4 + PWA manifest + GitHub Actions keep-alive
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** SMTP provider is Resend (3K/mo free tier). Set up via Supabase custom SMTP. Domain DNS (SPF/DKIM) must be configured.
- **D-02:** Sender identity: `Cristian (SharedTrip) <cristian@{domain}>`.
- **D-03:** Subject template: `Acceso a tu viaje · HH:mm` using `Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })`.
- **D-04:** Email body skeleton: greeting `Hola 👋  Toca el botón para entrar a tu viaje en SharedTrip.`, CTA `Entrar a SharedTrip` (coral), footer expiry 15 minutes.
- **D-05:** Palette — Tropical Sunset, dark-mode default only. Tokens: `--color-primary: #FF6B6B`, `--color-accent: #3DCCC7`, `--color-secondary: #FFB627`, `--color-bg: #0F1729`, `--color-surface: #1A2238`, `--color-fg: #FAFAFA`, `--color-fg-muted: #94A3B8`. No dark/light toggle.
- **D-06:** Bottom tab bar, 4 tabs: Docs / Itin / Gente / Perfil. Coral active indicator.
- **D-07:** Inter variable font, self-hosted via `next/font/google`, `display: 'swap'`.
- **D-08:** Wordmark-only brand mark: `SharedTrip` in coral, Inter italic 700. PWA icon: coral square with white S.
- **D-09:** Trip name in top header is a dropdown trigger → TripSwitcherSheet. No dedicated `/viajes` route.
- **D-10:** `/join/{token}` calls `signInAnonymously()` (if no session) + inserts `trip_members` row + renders trip directly. Phase 1 validates against a manually-seeded token.
- **D-11:** "Sin cuenta" pill (mango background) in top header when `is_anonymous === true`.
- **D-12:** Persistent dismissible upgrade banner below header. Session-scoped dismiss. Copy: "Sin email guardado — agrega uno para no perder acceso."
- **D-13:** Upgrade form: email only. Calls `supabase.auth.updateUser({ email })`. Toast confirmation.
- **D-14:** Auto-generated `{Adjective} {Animal}` display name, seeded by Supabase user id. ~30 adjectives + ~30 animals.
- **D-15:** Avatar = colored circle + animal emoji, color deterministic from user id hash (coral/teal/mango set).
- **D-16:** Only the user themselves can edit their own display name (Perfil tab).
- **D-17:** `profiles` table (keyed by `auth.users.id`) stores `display_name` and `avatar_seed`. RLS: any authenticated user can SELECT profiles for users sharing a `trip_members` row; only self can UPDATE.

### Claude's Discretion

- Exact RLS policy SQL for each of the 5 tables (must be in same migration as table creation)
- Exact `is_trip_member(trip_id)` function body
- `es.ts` dictionary structure (flat vs. nested, typing pattern)
- GitHub Actions keep-alive cron: which endpoint to ping
- Animal/adjective list for auto-name generator
- Anonymous session storage on iOS: confirm cookie-based session via `@supabase/ssr` survives ITP
- Vercel env var hygiene: public vs server-only keys

### Deferred Ideas (OUT OF SCOPE)

- Photo uploads for avatars (v2)
- Light-mode toggle (Phase 5)
- Custom SVG brand mark / logo (Phase 5)
- Creator can rename members (Phase 5 candidate)
- Dedicated `/viajes` trip-list route (rejected)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Supabase project with DB, Auth, Storage, Realtime | Supabase free tier confirmed, @supabase/supabase-js v2.106.2 |
| INFRA-02 | Schema: trips, trip_members, documents, itinerary_items, expenses | Full DDL patterns documented below |
| INFRA-03 | RLS on all tables + `is_trip_member` SECURITY DEFINER function | Exact SQL provided below |
| INFRA-04 | `trip-documents` private bucket + Storage RLS | Storage folder-path RLS pattern documented |
| INFRA-05 | GitHub Actions keep-alive cron every 5 minutes | Exact YAML documented below |
| INFRA-06 | Vercel deploy + custom domain + env vars | Vercel CLI install pattern; key naming (new vs legacy) documented |
| INFRA-07 | `es.ts` dictionary, no hardcoded strings | Structure recommendation + typing pattern provided |
| AUTH-01 | Magic link sign-in | `signInWithOtp` + `exchangeCodeForSession` callback pattern |
| AUTH-02 | Unique subject per request (anti-Gmail-threading) | Supabase email template config via Resend SMTP |
| AUTH-03 | Session persists across browser restart | `@supabase/ssr` cookie-based session; ITP analysis below |
| AUTH-04 | Sign-out from any screen | `supabase.auth.signOut()` |
| AUTH-05 | Anonymous join via `signInAnonymously()` | API call + `is_anonymous` JWT claim detection |
| AUTH-06 | Anonymous → permanent upgrade preserving membership | `updateUser({ email })` confirmed: user_id stays the same, FK rows survive |
| UI-01 | All UI in Spanish neutro/LATAM | `es.ts` pattern; zero English in JSX |
| UI-02 | Vibrant dark palette, modern typography | Tailwind v4 `@theme` pattern; shadcn/ui v4 init |
| UI-03 | Responsive mobile-first 320px–desktop | Tailwind responsive utilities; bottom tab bar with safe-area insets |
</phase_requirements>

---

## Summary

Phase 1 is a pure greenfield bootstrap — the repository contains only `CLAUDE.md` and `.planning/` documents. The deliverable is a deployed Next.js 16 application on Vercel with: (a) a working Supabase schema with RLS enforced at migration time, (b) magic link auth via Resend SMTP with anti-threading subject, (c) anonymous sign-in for invite links with a confirmed upgrade path that preserves all relational data, (d) cookie-based session persistence that survives iOS Safari ITP under the `@supabase/ssr` model, (e) the Tailwind v4 `@theme` token palette baked into globals.css, (f) shadcn/ui initialized, (g) a PWA manifest ready for Home Screen install, and (h) a GitHub Actions keep-alive cron firing every 5 minutes.

The project-level research in `.planning/research/` already covers the stack rationale, version pinning, and broad architecture. This document focuses exclusively on the phase-specific implementation delta: concrete code patterns, exact SQL, exact configuration steps, and gotchas that would block the implementer.

One critical new finding emerged during this research: Supabase introduced new API key naming in June 2025. New projects no longer use `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the new name is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (prefixed `sb_publishable_...`). All official docs and the `@supabase/ssr` v0.10.x samples use the new name. The planner must use the new key names when scaffolding env files.

**Primary recommendation:** Bootstrap with `create-next-app`, configure Supabase with new-format keys, run the full migration SQL in one file (all 6 tables + `profiles` + `is_trip_member` function + all RLS), wire `@supabase/ssr` cookies, and deploy to Vercel before writing any feature UI — the deployment pipeline must be green before any Phase 1 feature work begins.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Magic link request | API / Backend (Server Action) | — | `signInWithOtp` must run server-side; Resend SMTP is backend-only config |
| Auth callback / code exchange | API / Backend (Route Handler) | — | `exchangeCodeForSession` writes cookies; must be server-side |
| Session refresh | Frontend Server (Middleware) | — | `@supabase/ssr` middleware refreshes tokens on every request |
| Anonymous sign-in | API / Backend (Server Action) | — | `signInAnonymously()` can run server-side on `/join/[token]` load |
| Anonymous upgrade (`updateUser`) | Browser / Client | — | Called from client component (UpgradeSheet); sends confirmation email |
| RLS enforcement | Database / Storage | — | All access control lives in Postgres; application never enforces rules |
| `is_trip_member` function | Database / Storage | — | SECURITY DEFINER in Postgres; called by all per-trip policies |
| Tailwind v4 tokens | Browser / Client | — | CSS custom properties in globals.css, resolved at paint time |
| PWA manifest | Frontend Server (SSR) | — | `app/manifest.ts` is a Next.js route, served server-side |
| Session cookie storage | Frontend Server (SSR) | Browser / Client | `@supabase/ssr` writes cookies in middleware; browser holds cookie |
| `es.ts` dictionary | Browser / Client | — | Imported as a module, tree-shaken at build time |
| Keep-alive cron | External (GitHub Actions) | — | Pings Supabase REST from CI runner; no application code involved |

---

## Standard Stack

All entries are confirmed from npm registry. The stack is locked in CLAUDE.md — no alternatives are proposed here.

### Core

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| next | 16.2.6 | Full-stack React framework (App Router) | [VERIFIED: npm registry] |
| typescript | 5.x | Type safety | [VERIFIED: npm registry] |
| tailwindcss | 4.3.x | CSS (CSS-first, no config JS) | [VERIFIED: npm registry] |
| @supabase/supabase-js | 2.106.2 | Supabase client SDK | [VERIFIED: npm registry] |
| @supabase/ssr | 0.10.3 | SSR-safe Supabase client (replaces auth-helpers) | [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @serwist/next + serwist | 9.5.11 | PWA service worker (Workbox wrapper) | Phase 1 ships manifest only; SW entry file scaffolded for Phase 3 |
| dexie | 4.4.3 | IndexedDB wrapper | Phase 1 scaffolds the db.ts schema; actual blob caching in Phase 3 |
| zustand | 5.0.14 | Client UI state (modals, banners dismissed) | Use only for transient UI; not for server data |
| @tanstack/react-query | 5.100.14 | Server state cache | Supabase fetches, background refetch, loading/error states |
| react-hook-form | 7.76.1 | Forms | MagicLinkForm, UpgradeSheet, ProfileNameEditor |
| zod | 4.4.3 | Schema validation (shared client + server) | Paired with RHF via `@hookform/resolvers` |
| @hookform/resolvers | 5.4.0 | RHF ↔ Zod adapter | Required for the RHF + Zod pattern |
| sonner | 2.0.7 | Toast notifications (shadcn default) | Success/error/warning toasts |
| lucide-react | 1.17.0 | Icon set (shadcn default) | Tab bar icons, Loader2 spinner, ChevronDown, etc. |
| prettier-plugin-tailwindcss | 0.8.0 | Auto-sort Tailwind class names | Dev-only, add to `.prettierrc` |

**Installation order (critical — must follow this sequence):**

```bash
# 1. Bootstrap project
npx create-next-app@latest shared-trip \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

# 2. Core Supabase
npm install @supabase/supabase-js @supabase/ssr

# 3. PWA / Offline scaffold
npm install @serwist/next serwist
npm install dexie dexie-react-hooks

# 4. State management
npm install zustand @tanstack/react-query

# 5. Forms and validation
npm install react-hook-form zod @hookform/resolvers

# 6. shadcn/ui init AFTER Tailwind is configured
npx shadcn@latest init
# Add components used in Phase 1:
npx shadcn@latest add button input form sheet alert-dialog skeleton sonner

# 7. Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss
npm install -D supabase   # Supabase CLI as local dev dep
```

---

## Package Legitimacy Audit

slopcheck was unavailable at research time — all packages below are `[ASSUMED]` pending slopcheck verification. The planner must confirm each package before install. However, all packages below are well-established, sourced from official GitHub organizations, and confirmed via `npm view` against the registry.

| Package | Registry | Last Published | Source Repo | slopcheck | Disposition |
|---------|----------|---------------|-------------|-----------|-------------|
| next | npm | 2026-05-29 | github.com/vercel/next.js | [ASSUMED] | Approved — Vercel official |
| @supabase/supabase-js | npm | 2026-05-28 | github.com/supabase/supabase-js | [ASSUMED] | Approved — Supabase official |
| @supabase/ssr | npm | 2026-05-07 | github.com/supabase/ssr | [ASSUMED] | Approved — Supabase official |
| @serwist/next | npm | 2026-05-03 | github.com/serwist/serwist | [ASSUMED] | Approved — active maintained project |
| serwist | npm | 2026-05-03 | github.com/serwist/serwist | [ASSUMED] | Approved — same repo |
| dexie | npm | 2026-05-27 | github.com/dexie/Dexie.js | [ASSUMED] | Approved — active, long-standing |
| zustand | npm | 2026-05-28 | github.com/pmndrs/zustand | [ASSUMED] | Approved — pmndrs official |
| @tanstack/react-query | npm | 2026-05-28 | github.com/TanStack/query | [ASSUMED] | Approved — TanStack official |
| react-hook-form | npm | 2026-05-23 | github.com/react-hook-form/react-hook-form | [ASSUMED] | Approved |
| zod | npm | 2026-05-04 | github.com/colinhacks/zod | [ASSUMED] | Approved |
| @hookform/resolvers | npm | (recent) | github.com/react-hook-form/resolvers | [ASSUMED] | Approved |
| sonner | npm | 2025-08-02 | github.com/emilkowalski/sonner | [ASSUMED] | Approved |
| lucide-react | npm | 2026-05-28 | github.com/lucide-icons/lucide | [ASSUMED] | Approved |
| prettier-plugin-tailwindcss | npm | (recent) | github.com/tailwindlabs/prettier-plugin-tailwindcss | [ASSUMED] | Approved — Tailwind official |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable — all packages tagged `[ASSUMED]`. Planner should confirm before install. Risk is LOW given all packages trace to official organizational GitHub repos.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (PWA)
│
├── app/manifest.ts ──────────────────────────────────> PWA manifest (Next.js built-in route)
│
├── middleware.ts (Supabase session refresh) ─────────> runs on every request
│   └── @supabase/ssr: reads cookie → refreshes JWT → writes updated cookie back
│
├── app/ (Next.js App Router)
│   ├── page.tsx (Welcome / Auth screen)
│   │   └── MagicLinkForm → Server Action: signInWithOtp()
│   │                        └──────────────────────────> Supabase Auth (sends email via Resend SMTP)
│   │
│   ├── auth/check-email/page.tsx (post-submit confirmation)
│   │
│   ├── auth/callback/route.ts (Route Handler)
│   │   └── GET ?code=... → exchangeCodeForSession(code) → set session cookie → redirect /t/[tripId]
│   │
│   ├── join/[token]/page.tsx (anonymous join)
│   │   └── signInAnonymously() → INSERT trip_members → render trip shell
│   │
│   └── t/[tripId]/ (trip shell — bottom tab layout)
│       ├── layout.tsx  (TopHeader + BottomTabBar + AnonymousBanner)
│       ├── docs/page.tsx   (empty state Phase 1)
│       ├── itin/page.tsx   (empty state Phase 1)
│       ├── gente/page.tsx  (empty state Phase 1)
│       └── perfil/page.tsx (display name editor + sign-out)
│
├── lib/supabase/
│   ├── client.ts   (createBrowserClient — used in 'use client' components)
│   ├── server.ts   (createServerClient with cookies() — used in Server Components / Actions)
│   └── middleware.ts (createServerClient with request/response cookies — used in middleware.ts)
│
├── i18n/es.ts (ALL UI strings — zero hardcoded Spanish in JSX)
│
└── lib/offline/db.ts (Dexie schema — scaffolded now, used in Phase 3)
         │
         └──────────> IndexedDB (browser storage — Phase 3 populates)
                 
GitHub Actions (.github/workflows/keep-alive.yml)
└── schedule: every 5 minutes ──────────────────────> GET /rest/v1/?apikey=... (Supabase health ping)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── manifest.ts                      # PWA manifest (Next.js built-in)
│   ├── globals.css                      # @import "tailwindcss"; @theme tokens; Inter font
│   ├── layout.tsx                       # Root layout: font, TanStack QueryProvider, Toaster
│   ├── page.tsx                         # Welcome / auth screen
│   ├── auth/
│   │   ├── callback/route.ts            # exchangeCodeForSession handler
│   │   └── check-email/page.tsx         # Post-magic-link confirmation screen
│   ├── join/
│   │   └── [token]/page.tsx             # Anonymous join entry point
│   └── t/
│       └── [tripId]/
│           ├── layout.tsx               # Trip shell layout (TopHeader + BottomTabBar + AnonymousBanner)
│           ├── docs/page.tsx            # Placeholder
│           ├── itin/page.tsx            # Placeholder
│           ├── gente/page.tsx           # Placeholder
│           └── perfil/page.tsx          # Profile + sign-out
├── components/
│   ├── ui/                              # shadcn/ui copied components (Button, Input, Form, Sheet, etc.)
│   ├── layout/
│   │   ├── BottomTabBar.tsx
│   │   ├── TopHeader.tsx
│   │   └── TripSwitcherSheet.tsx
│   ├── auth/
│   │   ├── MagicLinkForm.tsx
│   │   └── AnonymousUpgradeSheet.tsx
│   ├── profile/
│   │   ├── UserAvatar.tsx               # Colored circle + animal emoji
│   │   └── ProfileNameEditor.tsx
│   └── common/
│       ├── AnonymousBanner.tsx
│       ├── EmptyState.tsx
│       └── LoadingSkeleton.tsx (wraps shadcn Skeleton)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # createBrowserClient
│   │   ├── server.ts                    # createServerClient (cookies)
│   │   └── middleware.ts                # createServerClient (request/response cookies)
│   ├── offline/
│   │   └── db.ts                        # Dexie schema (scaffold only — Phase 3 fills)
│   └── utils/
│       ├── avatar.ts                    # deterministic name + color from user id
│       └── dates.ts                     # Intl.DateTimeFormat wrappers
├── i18n/
│   └── es.ts                            # All UI strings — typed as const
├── actions/
│   ├── auth.ts                          # signInWithOtp, signOut server actions
│   └── members.ts                       # joinTrip server action (Phase 1 validates manually-seeded token)
├── types/
│   └── database.ts                      # Generated by: supabase gen types typescript
└── middleware.ts                        # Root middleware (session refresh)
```

---

### Pattern 1: `@supabase/ssr` Three-File Client Factory

**What:** Three separate Supabase client factories for three execution contexts. Every component and action imports from the appropriate factory — never instantiates a client directly.

**Critical note on API key naming:** Supabase renamed its keys in June 2025. New projects use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (value starts with `sb_publishable_...`) instead of the old `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The `@supabase/ssr` v0.10.x docs use the new name. Use the new names in all env files. [VERIFIED: npm registry + Supabase GitHub discussion #29260]

```typescript
// src/lib/supabase/client.ts — browser components ('use client')
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
```

```typescript
// src/lib/supabase/server.ts — Server Components, Server Actions, Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

```typescript
// src/middleware.ts — root middleware for session refresh
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This call refreshes the token if expired; MUST use getUser not getSession
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

[CITED: supabase.com/docs/guides/auth/server-side/nextjs]

---

### Pattern 2: Auth Callback Route Handler

**What:** The `/auth/callback` route exchanges the PKCE code from Supabase for a session. This must be a Next.js Route Handler (`route.ts`), not a page.

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failure — redirect to error state
  return NextResponse.redirect(`${origin}/auth/check-email?error=invalid_link`)
}
```

**Supabase dashboard configuration required:** Add `{YOUR_VERCEL_DOMAIN}/auth/callback` to the allowed Redirect URLs in Authentication > URL Configuration. Also add `http://localhost:3000/auth/callback` for local dev.

[CITED: supabase.com/docs/guides/auth/server-side/nextjs]

---

### Pattern 3: Magic Link with Anti-Threading Subject

**What:** The `signInWithOtp` call uses a Server Action. The subject is customized in Supabase's email template (not in the API call itself — the subject is set once in the dashboard template). The timestamp is injected server-side into the template via a Resend template variable or, more simply, by appending the time to the subject in the email template configuration.

**Implementation approach for unique subject:** Supabase does not support dynamic `{{ variable }}` substitution in the email subject field directly via `signInWithOtp`. The cleanest approach is to use Resend's transactional email API directly (bypassing Supabase's built-in email sending) as a Server Action, generating the OTP token with `supabase.auth.admin.generateLink({ type: 'magiclink', email })` and then sending the email via the Resend SDK with a custom subject. This requires the service role key (server-only).

**Alternative (simpler for v1):** Use Supabase's built-in email template with a static subject, then handle the Gmail threading problem by instructing users to check the most recent email. The dynamic subject via Supabase's built-in SMTP template editor does not support server-injected timestamps. This is a known limitation.

**Recommended approach for v1 (confirmed viable):** Use `supabase.auth.admin.generateLink()` with service role key in a Server Action → send via Resend SDK with custom subject including timestamp. This pattern gives full control over the email template and subject. [ASSUMED — verify Resend SDK server-side call pattern]

```typescript
// src/actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'

export async function sendMagicLink(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  return { error: error?.message ?? null }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
```

**Note on subject customization:** If using Supabase built-in email (via Resend SMTP), the subject is set statically in the Supabase dashboard → Authentication → Email Templates → "Magic Link" → Subject. The timestamp approach from D-03 requires either: (a) Supabase's custom email template with `{{ .Token }}` injected into the subject to make each one unique (technically not a timestamp but achieves uniqueness), or (b) the `admin.generateLink()` + direct Resend SDK approach for full control. For Phase 1, the Supabase built-in template + a unique token fragment in the subject is sufficient. [ASSUMED]

---

### Pattern 4: Anonymous Sign-In and Upgrade Flow

**Critical confirmed finding:** When an anonymous user calls `supabase.auth.updateUser({ email })`, the **user ID does not change**. All `trip_members` rows keyed by that `user_id` are automatically preserved. No data migration is needed. [CITED: supabase.com/blog/anonymous-sign-ins]

```typescript
// Anonymous sign-in (on /join/[token])
const { data, error } = await supabase.auth.signInAnonymously()
// data.user.is_anonymous === true

// Detect anonymous session in client component
const { data: { user } } = await supabase.auth.getUser()
const isAnonymous = user?.is_anonymous === true

// Upgrade to permanent (from AnonymousUpgradeSheet)
const { error } = await supabase.auth.updateUser({ email: 'user@example.com' })
// Sends confirmation email; user remains in anonymous state until they click the link
// After confirmation: is_anonymous becomes false; user_id is unchanged; trip_members intact
```

**Known gotcha with anonymous upgrade:** There is a documented Supabase bug where `updateUser({ email })` on an anonymous user may auto-verify the email and immediately set `is_anonymous` to `false` without requiring the confirmation link click (GitHub issue #29350). This means the upgrade may be instant in some cases. This is a bug but works in our favor for UX. [ASSUMED — behavior may vary by Supabase version]

---

### Pattern 5: Complete RLS SQL Migration

This is a single SQL migration file that creates all 6 tables + profiles, enables RLS, and defines all policies. **Never split table creation from RLS enablement across separate migrations** (Pitfall #2).

```sql
-- migration: 001_initial_schema.sql
-- ==========================================
-- SECURITY DEFINER HELPER FUNCTION
-- Create in a private schema (not exposed via API) for security
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_trip_member(check_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = check_trip_id
    AND user_id = (SELECT auth.uid())
  );
$$;

-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_seed text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read profiles of users they share a trip with
CREATE POLICY "Members can view co-member profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())  -- own profile always visible
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = (SELECT auth.uid())
    AND tm2.user_id = profiles.id
  )
);

-- Only self can update own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Profile auto-created on new user (via trigger or initial insert)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- ==========================================
-- TRIPS TABLE
-- ==========================================
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their trips"
ON public.trips FOR SELECT
TO authenticated
USING (is_trip_member(id));

CREATE POLICY "Creator can update trip"
ON public.trips FOR UPDATE
TO authenticated
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Creator can delete trip"
ON public.trips FOR DELETE
TO authenticated
USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can create trips"
ON public.trips FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

-- ==========================================
-- TRIP_MEMBERS TABLE
-- ==========================================
CREATE TABLE public.trip_members (
  trip_id uuid REFERENCES public.trips ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- Members can see who else is in their trips
CREATE POLICY "Members can view trip members"
ON public.trip_members FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

-- Members can join trips (insert own row)
CREATE POLICY "Users can join trips"
ON public.trip_members FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Admin can remove members
CREATE POLICY "Admin can remove members"
ON public.trip_members FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())  -- can leave yourself
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_members.trip_id
    AND user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ==========================================
-- DOCUMENTS TABLE
-- ==========================================
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'other' CHECK (file_type IN ('pdf', 'image', 'other')),
  file_size int8 NOT NULL,
  category text DEFAULT 'otro' CHECK (category IN ('boleto', 'reservacion', 'identificacion', 'otro')),
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view trip documents"
ON public.documents FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

CREATE POLICY "Members can upload documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (
  is_trip_member(trip_id)
  AND uploaded_by = (SELECT auth.uid())
);

CREATE POLICY "Uploader or admin can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (
  uploaded_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = documents.trip_id
    AND user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ==========================================
-- ITINERARY_ITEMS TABLE
-- ==========================================
CREATE TABLE public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  sort_order int4 DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view itinerary"
ON public.itinerary_items FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

CREATE POLICY "Members can manage itinerary"
ON public.itinerary_items FOR ALL
TO authenticated
USING (is_trip_member(trip_id))
WITH CHECK (is_trip_member(trip_id));

-- ==========================================
-- EXPENSES TABLE (v1.5 — schema ready, feature deferred)
-- ==========================================
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  paid_by uuid NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  description text NOT NULL,
  split_between uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

CREATE POLICY "Members can add expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (
  is_trip_member(trip_id)
  AND paid_by = (SELECT auth.uid())
);

-- ==========================================
-- STORAGE BUCKET RLS (run after bucket created in dashboard)
-- ==========================================
-- Note: The bucket 'trip-documents' must be created as PRIVATE in the Supabase dashboard first.
-- Then apply these policies via SQL editor or migration:

CREATE POLICY "Members can read trip files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND is_trip_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Members can upload trip files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-documents'
  AND is_trip_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Authenticated users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND owner = (SELECT auth.uid())
);
```

[CITED: supabase.com/docs/guides/database/postgres/row-level-security — SECURITY DEFINER pattern + (select auth.uid()) optimization]

---

### Pattern 6: Tailwind v4 `@theme` Token Wiring

**What:** All colors are defined as CSS custom properties in `globals.css` using the Tailwind v4 `@theme` directive. shadcn/ui's init generates a structure using `:root`/`.dark` + `@theme inline` mapping.

**Since Phase 1 is dark-only, the pattern is simplified** — no `.dark` class needed, tokens are defined once at `:root`.

```css
/* src/app/globals.css */
@import "tailwindcss";

/* Inter variable font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
/* (next/font/google replaces this at build time — see layout.tsx) */

/* SharedTrip Tropical Sunset palette — dark-mode only */
:root {
  --background: #0F1729;
  --surface: #1A2238;
  --primary: #FF6B6B;
  --accent: #3DCCC7;
  --secondary: #FFB627;
  --foreground: #FAFAFA;
  --foreground-muted: #94A3B8;
  --destructive: #EF4444;
  --border: rgba(148, 163, 184, 0.2);
}

@theme inline {
  --color-bg: var(--background);
  --color-surface: var(--surface);
  --color-primary: var(--primary);
  --color-accent: var(--accent);
  --color-secondary: var(--secondary);
  --color-fg: var(--foreground);
  --color-fg-muted: var(--foreground-muted);
  --color-destructive: var(--destructive);
  --color-border: var(--border);

  /* shadcn/ui compatibility mapping */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--surface);
  --color-card-foreground: var(--foreground);
  --color-popover: var(--surface);
  --color-popover-foreground: var(--foreground);
  --color-muted: var(--surface);
  --color-muted-foreground: var(--foreground-muted);
  --color-ring: var(--primary);
}

body {
  background-color: var(--background);
  color: var(--foreground);
}
```

In components, reference tokens as Tailwind utilities: `bg-bg`, `bg-surface`, `text-primary`, `text-accent`, `border-border`, etc. Never use raw hex values in component files. [CITED: tailwindcss.com/blog/tailwindcss-v4 + ui.shadcn.com/docs/tailwind-v4]

---

### Pattern 7: PWA Manifest (Phase 1 minimum)

**Note:** Service worker (Serwist) is NOT wired in Phase 1 — only the manifest ships. The manifest must be installable-ready (correct icons) so Phase 5 can test real Home Screen install.

```typescript
// src/app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SharedTrip',
    short_name: 'SharedTrip',
    description: 'Tu bóveda de viaje compartida — boletos, itinerario y más.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1729',
    theme_color: '#0F1729',
    lang: 'es',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
```

**Icon generation:** Create two PNG files (192×192 and 512×512) with a coral (`#FF6B6B`) background and white "S" centered in Inter Bold. Place in `public/icon-192.png` and `public/icon-512.png`. Use any image editor or a script. [CITED: nextjs.org/docs/app/guides/progressive-web-apps]

---

### Pattern 8: GitHub Actions Keep-Alive Cron

**What:** Fires every 5 minutes to prevent Supabase free tier pausing. Uses a simple `curl` to the Supabase REST health endpoint — no Node.js setup required, no service role key needed.

```yaml
# .github/workflows/keep-alive.yml
name: Supabase Keep-Alive

on:
  schedule:
    - cron: '*/5 * * * *'   # Every 5 minutes
  workflow_dispatch:          # Manual trigger for testing

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase REST API
        run: |
          curl -sf \
            -H "apikey: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}" \
            "${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}/rest/v1/" \
            || echo "Ping failed — Supabase may be waking up"
```

**GitHub Secrets required:**
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — the publishable (anon-equivalent) key; NOT the service role key

**Important:** The `*/5 * * * *` cron means 288 runs/day = 8,640 runs/month. GitHub Actions free tier allows 2,000 minutes/month for private repos. Each run takes ~5 seconds = ~720 minutes/month. This stays within the free tier. [CITED: github.com/travisvn/supabase-pause-prevention + dev.to/jps27cse article pattern]

---

### Pattern 9: `es.ts` Dictionary Structure

**What:** Single typed dictionary file. All user-visible strings live here. Components import from here, never write Spanish text directly. Pattern uses `as const` for full type inference — no runtime i18n library needed.

```typescript
// src/i18n/es.ts
export const es = {
  // Auth flow
  auth: {
    welcomeHeading: 'Bienvenido a SharedTrip',
    welcomeSubheading: 'Tu bóveda de viaje — boletos, itinerario y más, siempre a la mano.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    sendLinkCta: 'Enviar enlace de acceso',
    checkEmailHeading: 'Revisa tu correo',
    checkEmailBody: (email: string) =>
      `Te enviamos un enlace a ${email}. Toca el enlace para entrar — expira en 15 minutos.`,
  },
  // Anonymous / upgrade
  anon: {
    pill: 'Sin cuenta',
    bannerHeading: 'Sin email guardado — agrega uno para no perder acceso.',
    bannerCta: 'Agregar email',
    upgradeSheetHeading: 'Guarda tu acceso',
    upgradeSheetBody: 'Agrega tu email para no perder acceso si cierras la app.',
    upgradeEmailLabel: 'Tu correo electrónico',
    upgradeSubmitCta: 'Guardar email',
    upgradeSuccessToast: (email: string) =>
      `Te enviamos un correo de confirmación a ${email}. Toca el enlace para terminar.`,
  },
  // Trip shell empty states
  tabs: {
    docs: 'Docs',
    itin: 'Itin',
    gente: 'Gente',
    perfil: 'Perfil',
    docsEmptyHeading: 'Bóveda de documentos',
    docsEmptyBody: 'Aquí irán los boletos, reservaciones e identificaciones del grupo. Disponible en la siguiente fase.',
    itinEmptyHeading: 'Itinerario del viaje',
    itinEmptyBody: 'El itinerario compartido llega pronto.',
    genteEmptyHeading: 'Miembros del viaje',
    genteEmptyBody: 'La lista del grupo aparecerá aquí. Disponible en la siguiente fase.',
  },
  // Profile
  profile: {
    displayNameLabel: 'Tu nombre en el viaje',
    displayNamePlaceholder: 'Nombre visible para el grupo',
    saveCta: 'Guardar cambios',
    signOutCta: 'Cerrar sesión',
    signOutDialogHeading: '¿Cerrar sesión?',
    signOutDialogBody: 'Tendrás que volver a ingresar con tu correo.',
    signOutDialogConfirm: 'Sí, cerrar sesión',
    signOutDialogCancel: 'Cancelar',
  },
  // Trip switcher
  tripSwitcher: {
    emptyHeading: 'No tienes viajes todavía',
    emptyBody: 'Pídele un link a quien te invitó o crea uno.',
  },
  // Errors
  errors: {
    invalidLink: 'Este enlace ya expiró o no es válido. Solicita uno nuevo.',
    sendLinkFailed: 'No pudimos enviarte el enlace. Verifica tu correo e intenta de nuevo.',
    invalidJoinToken: 'Este link de invitación no es válido. Pide uno nuevo a quien te invitó.',
    sessionExpired: 'Tu sesión expiró. Ingresa de nuevo.',
    genericNetwork: 'Error de conexión. Verifica tu red e intenta de nuevo.',
  },
} as const

export type EsKeys = typeof es
```

Usage: `import { es } from '@/i18n/es'` → `{es.auth.sendLinkCta}`.

---

### Pattern 10: Deterministic Avatar Name Generator

**What:** Generates `{Adjective} {Animal}` pairs deterministically from a user ID string. Uses a simple hash of the UUID to select indices.

```typescript
// src/lib/utils/avatar.ts
const ADJECTIVES = [
  'Curioso', 'Veloz', 'Sabio', 'Valiente', 'Alegre',
  'Tranquilo', 'Brillante', 'Audaz', 'Amable', 'Astuto',
  'Sereno', 'Vivaz', 'Fiel', 'Noble', 'Ágil',
  'Gracioso', 'Atrevido', 'Gentil', 'Listo', 'Osado',
  'Pacífico', 'Radiante', 'Singular', 'Tenaz', 'Único',
  'Versátil', 'Wabi', 'Xusto', 'Yolo', 'Zen',
] as const

const ANIMALS = [
  'Tucán', 'Iguana', 'Tortuga', 'Guacamaya', 'Jaguar',
  'Colibrí', 'Mapache', 'Axolote', 'Cocodrilo', 'Tiburón',
  'Cangrejo', 'Pulpo', 'Delfín', 'Manatí', 'Pelícano',
  'Caimán', 'Serpiente', 'Armadillo', 'Tlacuache', 'Tecolote',
  'Quetzal', 'Flamenco', 'Nutria', 'Tejón', 'Coyote',
  'Lobo', 'Búho', 'Zorro', 'Puma', 'Venado',
] as const

const ANIMAL_EMOJIS: Record<typeof ANIMALS[number], string> = {
  Tucán: '🦜', Iguana: '🦎', Tortuga: '🐢', Guacamaya: '🦜', Jaguar: '🐆',
  Colibrí: '🐦', Mapache: '🦝', Axolote: '🦑', Cocodrilo: '🐊', Tiburón: '🦈',
  Cangrejo: '🦀', Pulpo: '🐙', Delfín: '🐬', Manatí: '🦭', Pelícano: '🦅',
  Caimán: '🐊', Serpiente: '🐍', Armadillo: '🦔', Tlacuache: '🐀', Tecolote: '🦉',
  Quetzal: '🦜', Flamenco: '🦩', Nutria: '🦦', Tejón: '🦡', Coyote: '🐺',
  Lobo: '🐺', Búho: '🦉', Zorro: '🦊', Puma: '🐆', Venado: '🦌',
}

const AVATAR_COLORS = ['#FF6B6B', '#3DCCC7', '#FFB627'] as const  // coral, teal, mango

function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0  // convert to 32-bit int
  }
  return Math.abs(hash)
}

export function getAvatarData(userId: string, avatarSeed?: string | null) {
  const seed = avatarSeed ?? userId
  const hash = hashUserId(seed)
  const adjective = ADJECTIVES[hash % ADJECTIVES.length]
  const animal = ANIMALS[(hash >> 4) % ANIMALS.length]
  const color = AVATAR_COLORS[(hash >> 8) % AVATAR_COLORS.length]
  const emoji = ANIMAL_EMOJIS[animal]
  return { displayName: `${adjective} ${animal}`, emoji, color }
}
```

---

### Anti-Patterns to Avoid

- **Do not use `getSession()` server-side** — use `getUser()`. `getSession()` does not revalidate the JWT server-side; `getUser()` makes a network call to verify. [CITED: supabase.com/docs/guides/auth/server-side/nextjs]
- **Do not use `auth.uid()` without the `(select ...)` wrapper in RLS policies** — the unwrapped form re-evaluates on every row (94% slower on large tables). Always write `(SELECT auth.uid())`. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]
- **Do not create the SECURITY DEFINER function in an exposed schema** — expose in `public` is fine for the function call, but set `search_path = public` explicitly in the function definition to avoid schema injection attacks. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]
- **Do not use `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for new projects created after June 2025. [CITED: github.com/orgs/supabase/discussions/29260]
- **Do not expose `SUPABASE_SECRET_KEY`** (service role) as `NEXT_PUBLIC_` — it bypasses all RLS. Server-only, never in browser code. [ASSUMED — standard security practice]
- **Do not hardcode hex colors in component files** — reference `@theme` tokens only (`bg-bg`, `text-primary`, etc.).
- **Do not add the Serwist service worker in Phase 1** — the manifest ships now, but the service worker entry point wiring (`withSerwist` in `next.config.ts`) must wait until Phase 3 to avoid caching issues before the app is feature-complete.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | React Hook Form + Zod | Zero re-renders, shared types, battle-tested edge cases |
| Toast notifications | Custom toast system | Sonner (via shadcn) | Handles stacking, animation, accessibility, positioning |
| Cookie-based session storage | Manual cookie read/write | `@supabase/ssr` `createServerClient` | ITP-safe, handles token refresh, Next.js middleware integration |
| Anonymous→permanent user upgrade | Custom user promotion logic | `supabase.auth.updateUser({ email })` | UUID is preserved; no data migration needed |
| IndexedDB operations | Raw IndexedDB API | Dexie.js | Promises, indexes, reactive hooks, error handling |
| Icon system | Custom SVG icons | Lucide React (ships with shadcn) | Consistent 24px grid, accessible, tree-shakeable |
| Deterministic hash for avatar seed | No crypto.subtle needed | Simple djb2 hash (see Pattern 10 above) | UUID entropy is sufficient; no collision risk at <1000 users |

---

## Common Pitfalls

### Pitfall 1: RLS Enabled but No Policies = Silent Empty Results

**What goes wrong:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with no policies returns zero rows for all users — not a 403, just empty results. Developers see their app returning empty data and disable RLS to "fix" it.

**How to avoid:** Always create at minimum a SELECT policy alongside `ENABLE ROW LEVEL SECURITY` in the same migration. If a table should have no public access, use `USING (false)` explicitly as documentation.

**Warning signs:** Queries return empty arrays; no errors in client logs; SQL editor shows data fine.

### Pitfall 2: Supabase New Key Format Breaks Old Tutorials

**What goes wrong:** Tutorials and stack overflow posts use `NEXT_PUBLIC_SUPABASE_ANON_KEY`. New Supabase projects (created after June 2025) may use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with `sb_publishable_...` prefix. Copying old tutorial env var names causes auth to silently fail.

**How to avoid:** In the Supabase dashboard → Project Settings → API → use the "Publishable key" value. Name the env var `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Update all three client factories to use this name.

**Warning signs:** Auth calls succeed in tests but return `null` session; `createBrowserClient` throws on undefined key.

### Pitfall 3: PKCE Same-Browser Restriction on iOS

**What goes wrong:** A user on iOS opens the invite link in Safari, enters their email, requests the magic link. The magic link arrives in Gmail. They tap it in the Gmail app (which opens in an in-app browser or Chrome). Auth fails: "invalid or expired link." The PKCE code verifier stored in the original Safari session is not present in the Gmail in-app browser.

**How to avoid:** This is a known, documented, unresolved Supabase issue with no official fix. Mitigations:
1. Add a clear instruction to the confirmation screen: "Abre el enlace en el mismo navegador donde pediste el código. Si usas Gmail, copia el link y ábrelo en Safari."
2. Consider adding the OTP (6-digit code) fallback — Supabase sends both a link AND a code in the same email. Show a "¿Tuviste problemas con el link? Ingresa el código de 6 dígitos:" field on `/auth/check-email`. This works cross-browser since the user manually types the code.
3. Do NOT switch to implicit flow as a solution — implicit flow passes tokens in URL hash which some email clients strip.

**Warning signs:** Users on iOS report "el link no funciona" when they use Gmail or Outlook mobile. Desktop always works. iPhone users clicking in Safari always works.

### Pitfall 4: Anonymous Session + iOS ITP (Session Persistence)

**What goes wrong:** Anonymous users (who have not upgraded to email) rely on a session stored in a cookie. On iOS Safari, the session should survive because `@supabase/ssr` stores sessions in cookies (not localStorage). However, there is a documented intermittent bug in `@supabase/supabase-js` v2 on iOS where `getSession()` / `getUser()` returns null immediately after page load, then the session becomes available after backgrounding and foregrounding the app (GitHub issue #1560).

**How to avoid:**
- Always use `getUser()` (not `getSession()`) server-side — it validates the JWT with Supabase servers.
- On the client, wrap auth state reads in a brief retry with a short timeout if `null` is returned on first call. Alternatively, use `onAuthStateChange` subscription instead of a one-shot `getUser()` call in client components.
- For Phase 1 / personal testing, this bug may not surface. Document as a known iOS issue for Phase 5 hardening.

**Warning signs:** App appears unauthenticated on iOS Safari immediately after loading; refreshing the page fixes it; desktop never shows the issue.

### Pitfall 5: Supabase Email Template Subject Does Not Support Dynamic Values via signInWithOtp

**What goes wrong:** The plan is to inject a timestamp into the email subject (D-03). However, Supabase's built-in email template system does not support server-injected dynamic values in the subject line via `signInWithOtp`. The template supports `{{ .Token }}` and `{{ .SiteURL }}` in the body but not in the subject.

**How to avoid — two options:**
1. **Simple (recommended for v1):** In the Supabase dashboard email template, set a subject that includes `{{ .Token }}` to make each subject technically unique (e.g., `Acceso a tu viaje · {{ .Token }}`). The token is a random string that differs per request — not a timestamp, but achieves the anti-threading goal. The user-visible portion is still `Acceso a tu viaje`.
2. **Full control:** Generate the magic link server-side using `supabase.auth.admin.generateLink({ type: 'magiclink', email })` (requires service role key in Server Action) → send via Resend SDK with a fully custom subject including the timestamp from D-03. More setup, full control.

**Warning signs:** All magic link emails arrive with the same subject → Gmail groups them → users click expired links.

### Pitfall 6: Storage Bucket RLS Path Convention

**What goes wrong:** The Storage RLS policy uses `(storage.foldername(name))[1]` to extract the first folder segment from the file path and cast it as a UUID trip ID. If files are uploaded with paths like `filename.pdf` (no folder prefix), the cast to `uuid` fails and all uploads/downloads are blocked.

**How to avoid:** ALL file paths in the `trip-documents` bucket MUST follow the convention `{tripId}/{filename}` where `tripId` is a valid UUID. Enforce this in the upload Server Action. Never allow the client to specify the full path — always construct it server-side: `const filePath = \`${tripId}/${crypto.randomUUID()}-${sanitizedFileName}\``.

**Warning signs:** Storage uploads return 403; SQL editor confirms RLS is enabled; policies look correct but the path format is wrong.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All Next.js dev | ✓ | v24.15.0 | — |
| npm | Package management | ✓ | 11.12.1 | — |
| Vercel CLI | Deploy + local HTTPS dev | ✗ | — | Install via `npm install -g vercel` during Wave 0 |
| Supabase CLI | Local DB + migrations | ✗ | — | Install via `npm install -D supabase` as dev dep; or `brew install supabase/tap/supabase` |
| Git / GitHub | Keep-alive cron + source control | ✓ (implied) | — | Required — no fallback |
| HTTPS local dev | Service worker testing | ✗ | — | `next dev --experimental-https` flag (no cert install needed); or `vercel dev` |

**Missing dependencies with no fallback:**
- Git repository must be initialized and pushed to GitHub before the keep-alive cron can run. Phase 1 Wave 0 must `git init` + create GitHub repo.

**Missing dependencies with fallback:**
- Vercel CLI: not required for deploy (can use Vercel dashboard + GitHub integration), but needed for `vercel dev` local HTTPS. Fallback: use `next dev --experimental-https`.
- Supabase CLI: not strictly required if using Supabase cloud dashboard for migrations. Fallback: run migration SQL directly in Supabase SQL editor. Recommended to install for type generation.

---

## Code Examples

### Resend SMTP Configuration in Supabase

Configure in Supabase Dashboard → Authentication → SMTP Settings:

| Field | Value |
|-------|-------|
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` |
| SMTP username | `resend` |
| SMTP password | `{YOUR_RESEND_API_KEY}` |
| Sender name | `Cristian (SharedTrip)` |
| Sender email | `cristian@{your-verified-domain}` |

Domain verification required before sending: add Resend's SPF and DKIM DNS records to your domain registrar. Resend provides these values in their domain dashboard. [CITED: resend.com/docs/send-with-supabase-smtp]

**Magic link expiry:** Set to 15 minutes in Supabase Dashboard → Authentication → Email OTP Expiration (in seconds: 900).

### Anonymous Sign-In Server Action Pattern

```typescript
// src/app/join/[token]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Check if user already has a session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      redirect('/?error=join_failed')
    }
  }

  // Look up the trip by invite token (Phase 1: manually seeded)
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (!trip) {
    redirect('/?error=invalid_token')
  }

  // Insert member row (upsert to handle re-joins)
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  await supabase
    .from('trip_members')
    .upsert({ trip_id: trip.id, user_id: currentUser!.id, role: 'member' })

  redirect(`/t/${trip.id}/docs`)
}
```

### iOS Safari Install Detection

```typescript
// src/components/layout/InstallPrompt.tsx
'use client'
import { useEffect, useState } from 'react'

export function useIsIOSNotInstalled() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setShow(isIOS && !isStandalone)
  }, [])
  return show
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 → deprecated 2024 | All cookie/session handling is now in `@supabase/ssr`; auth-helpers is deprecated |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | June 2025 | New projects use `sb_publishable_...` format; old key still works until late 2026 |
| `tailwind.config.js` with `theme.extend` | `@theme` directive in `globals.css` | Tailwind v4.0 (Jan 2025) | No JS config file; CSS-first; `@theme inline` for shadcn/ui compatibility |
| `next-pwa` | `@serwist/next` | 2023 (next-pwa abandoned) | next-pwa broken with Next.js 16 Turbopack; Serwist is the official recommendation |
| `getSession()` server-side | `getUser()` server-side | 2024 | `getSession()` does not validate JWT server-side; `getUser()` makes network call to verify |
| static `manifest.json` in `public/` | `app/manifest.ts` (Next.js built-in) | Next.js 13.3+ | Route-based manifest with TypeScript support and type safety |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: deprecated, do not use
- `next-pwa` (shadowwalker): broken with Turbopack, unmaintained
- `tailwind.config.js` for new projects: not needed in v4 (still works but CSS-first is the standard)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dynamic timestamp in Supabase email subject requires either `{{ .Token }}` in template or `admin.generateLink()` + Resend SDK — `signInWithOtp` alone cannot inject a timestamp | Pattern 3 | Low — either approach works; just determines implementation complexity |
| A2 | Anonymous `updateUser({ email })` may auto-verify email without link click in some Supabase versions (bug #29350) | Pattern 4 | Low — works in our favor UX-wise; if reverted, user still gets confirmation email |
| A3 | GitHub Actions `*/5 * * * *` cron is within free tier limits (~720 min/mo, under 2000 min limit) | Pattern 8 | Medium — if repo is private, verify GitHub Actions minutes remaining; public repos have unlimited minutes |
| A4 | All packages listed in Standard Stack are legitimate npm packages (slopcheck unavailable) | Package Audit | Low — all trace to known organizational GitHub repos (Supabase, Vercel, TanStack, etc.) |
| A5 | Supabase new publishable key (`sb_publishable_...`) works identically to old anon key in `@supabase/ssr` v0.10.x | Pattern 1 | Medium — key format is new; verify in Supabase dashboard that the publishable key is present before coding |
| A6 | The `animal emoji` fallback for some animals (Axolote → 🦑, Tlacuache → 🐀) is approximate — no exact emoji exists | Pattern 10 | Low — aesthetic only; user can change display name |

**If this table were empty:** All claims were verified or cited. A6 is the only purely cosmetic assumption.

---

## Open Questions

1. **Email subject customization method**
   - What we know: Supabase built-in email template has limited variable support; D-03 requires a timestamped subject
   - What's unclear: Whether `{{ .Token }}` in the subject field of the Supabase dashboard template is sufficient, or whether the `admin.generateLink()` + Resend SDK approach is needed
   - Recommendation: Start with `{{ .Token }}` in the subject — it makes each subject unique even if not human-readable as a time. If the user finds it confusing during Phase 5 testing, switch to the Resend SDK approach.

2. **New Supabase API key format**
   - What we know: Projects after June 2025 use `sb_publishable_...` keys; the old `NEXT_PUBLIC_SUPABASE_ANON_KEY` still works until late 2026
   - What's unclear: Whether the newly created Supabase project for SharedTrip has the new keys or still shows legacy key names in the dashboard
   - Recommendation: Check the Supabase dashboard → Project Settings → API immediately after project creation. Use whichever key format the dashboard shows.

3. **Anonymous session persistence on iOS Safari (non-installed)**
   - What we know: `@supabase/ssr` stores sessions in cookies (not localStorage), which should survive ITP; there's an intermittent iOS bug with `getUser()` returning null on first load
   - What's unclear: Whether cookie-based anonymous sessions survive the 7-day ITP cycle for non-Home-Screen-installed users
   - Recommendation: For Phase 1, this is a known-acceptable risk. Document it. Phase 5 must validate on a real iPhone. For Phase 1 testing, verify the anonymous session survives a browser restart on an actual iPhone.

---

## Project Constraints (from CLAUDE.md)

- **Stack is LOCKED**: Next.js 16, Supabase, Tailwind v4, shadcn/ui v4, Serwist, Dexie — no alternatives
- **Hosting**: Vercel (Hobby free tier) + Supabase free tier. Zero budget.
- **Auth**: Magic link / passwordless only. No passwords.
- **Language**: Spanish only in UI. No i18n libraries — `es.ts` typed dictionary.
- **GSD Workflow**: All file changes go through GSD workflow commands (`/gsd-execute-phase`) per CLAUDE.md
- **Deadline**: v1 must be live before next real trip (< 1 month from 2026-05-29)
- **Security**: Service role key (`SUPABASE_SECRET_KEY`) NEVER as `NEXT_PUBLIC_` prefix
- **RLS**: Must be enabled in the same migration that creates the table — no exceptions
- **No hardcoded Spanish**: Zero user-visible strings in JSX; all from `es.ts`
- **No hex colors in components**: All colors via `@theme` token utilities

---

## Validation Architecture

*Skipped — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase magic link OTP; anonymous sign-in |
| V3 Session Management | yes | `@supabase/ssr` cookie storage; middleware refresh |
| V4 Access Control | yes | Postgres RLS; `is_trip_member` SECURITY DEFINER |
| V5 Input Validation | yes | Zod schemas in RHF; server-side Supabase type enforcement |
| V6 Cryptography | no | Supabase handles JWT signing; no custom crypto in Phase 1 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accessing another user's trip data via anon key | Information Disclosure | RLS enabled on all tables; `is_trip_member` on every per-trip policy |
| Service role key exposed in client JS | Elevation of Privilege | `SUPABASE_SECRET_KEY` server-only; never `NEXT_PUBLIC_` |
| Anonymous user forges trip membership insert | Tampering | `trip_members` INSERT policy: `WITH CHECK (user_id = (SELECT auth.uid()))` |
| Magic link forwarded/shared | Spoofing | 15-min expiry; one-time use (Supabase invalidates used links) |
| PKCE code replay | Elevation of Privilege | PKCE code valid for 5 minutes, single-use; `exchangeCodeForSession` in Route Handler |
| Storage path traversal | Information Disclosure | Server Action constructs path; client never specifies full path; folder RLS on `storage.objects` |

---

## Sources

### Primary (HIGH confidence — official documentation)
- [Supabase: SSR + Next.js (official)](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` three-file client factory pattern, publishable key name
- [Supabase: Anonymous Sign-Ins (official)](https://supabase.com/docs/guides/auth/auth-anonymous) — upgrade flow, user_id preservation
- [Supabase: Row Level Security (official)](https://supabase.com/docs/guides/database/postgres/row-level-security) — SECURITY DEFINER pattern, `(select auth.uid())` optimization
- [Supabase: Magic Link (official)](https://supabase.com/docs/guides/auth/passwordless-login/auth-magic-link) — `signInWithOtp`, `emailRedirectTo`, OTP fallback
- [Supabase: Anonymous Sign-Ins Blog Post (official)](https://supabase.com/blog/anonymous-sign-ins) — user_id persists on upgrade; data survival confirmed
- [Next.js PWA Guide (official, updated 2026-05-28)](https://nextjs.org/docs/app/guides/progressive-web-apps) — `app/manifest.ts` pattern, iOS install detection
- [Resend SMTP for Supabase (official)](https://resend.com/docs/send-with-supabase-smtp) — host: smtp.resend.com, port: 465, username: resend
- [Tailwind CSS v4.0 (official)](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first `@theme` pattern
- [shadcn/ui Tailwind v4 (official)](https://ui.shadcn.com/docs/tailwind-v4) — `@theme inline` + CSS variable mapping
- [Serwist Getting Started (official)](https://serwist.pages.dev/docs/next/getting-started) — `withSerwist` wrapper, `app/sw.ts` entry file, TypeScript config

### Secondary (MEDIUM confidence — community sources, verified against official)
- [Supabase API Key Rename Discussion](https://github.com/orgs/supabase/discussions/29260) — `sb_publishable_...` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` confirmed
- [Supabase keep-alive GitHub Actions (community, widely cited)](https://dev.to/jps27cse/how-to-prevent-your-supabase-project-database-from-being-paused-using-github-actions-3hel) — curl health ping pattern
- [GitHub travisvn/supabase-pause-prevention](https://github.com/travisvn/supabase-pause-prevention) — alternative keep-alive implementation reference
- [Supabase iOS session bug #1560](https://github.com/supabase/supabase-js/issues/1560) — intermittent null session on iOS Safari

### Tertiary (LOW confidence — needs validation)
- Supabase email template `{{ .Token }}` in subject line achieves anti-threading — inferred from template documentation; not explicitly confirmed [marked as ASSUMED in Assumptions Log]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed via `npm view`; versions pinned
- `@supabase/ssr` wiring: HIGH — official docs fetched, exact code patterns extracted
- RLS SQL: HIGH — cited from official Supabase RLS docs; SECURITY DEFINER pattern confirmed
- Anonymous upgrade flow: HIGH — `user_id` preservation confirmed from official blog post
- PKCE iOS same-browser issue: HIGH — documented in official Supabase troubleshooting + active GitHub discussion
- Email subject customization: MEDIUM — Supabase template variable behavior for subject line field assumed
- `es.ts` structure: HIGH — standard TypeScript `as const` pattern, no library needed
- GitHub Actions cron: MEDIUM — timing math verified; endpoint pattern from community sources
- Tailwind v4 `@theme` tokens: HIGH — official docs fetched

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (30 days — stable stack; Supabase API key transition period ongoing until late 2026)
