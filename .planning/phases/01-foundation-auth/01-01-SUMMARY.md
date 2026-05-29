---
phase: 01-foundation-auth
plan: 01
subsystem: foundation
tags: [bootstrap, next.js, tailwind, shadcn, supabase, vercel, pwa, i18n]
dependency_graph:
  requires: []
  provides:
    - Next.js 16 project scaffold with TypeScript + Tailwind v4
    - Tropical Sunset @theme token palette in globals.css (frozen contract)
    - shadcn/ui v4 initialized with button, input, sheet, alert-dialog, skeleton, sonner
    - es.ts Spanish dictionary (auth + errors namespaces, expandable)
    - Welcome screen server component consuming es.auth.*
    - Wordmark component (coral Inter italic 700, text-primary token only)
    - GitHub repo with initial commits pushed
    - .env.local.example with correct env var names (new sb_publishable_ format)
    - ESLint + Prettier + Tailwind class sort configured
  affects:
    - All subsequent plans depend on @theme tokens from this plan
    - Plans 03/04/05 extend es.ts with anon/tabs/profile/tripSwitcher namespaces
    - Plan 02 runs supabase init + schema migration against project from Task 3
tech_stack:
  added:
    - next@16.2.6
    - react@19.2.4
    - typescript@5.x
    - tailwindcss@4.x (CSS-first, no tailwind.config.js)
    - "@supabase/supabase-js@^2.106.2"
    - "@supabase/ssr@^0.10.3"
    - "@serwist/next + serwist (scaffold only)"
    - "dexie + dexie-react-hooks (scaffold only)"
    - zustand@5.x
    - "@tanstack/react-query@5.x"
    - react-hook-form@7.x
    - zod@4.x
    - "@hookform/resolvers@5.x"
    - sonner@2.x
    - lucide-react@1.x
    - prettier-plugin-tailwindcss@0.8.x
    - eslint-config-next
    - supabase CLI (dev dep)
  patterns:
    - Tailwind v4 CSS-first @theme inline tokens in globals.css
    - es.ts as const typed dictionary — sole source of Spanish UI strings
    - shadcn/ui v4 components with Tropical Sunset palette override
    - Inter variable font via next/font/google with --font-inter CSS variable
key_files:
  created:
    - src/app/globals.css — Tropical Sunset @theme tokens
    - src/app/layout.tsx — Inter font, lang=es, Toaster
    - src/app/page.tsx — Welcome screen server component
    - src/i18n/es.ts — Spanish dictionary (auth + errors)
    - src/components/common/Wordmark.tsx — brand wordmark component
    - src/components/ui/ — shadcn button, input, sheet, alert-dialog, skeleton, sonner
    - components.json — shadcn/ui v4 config
    - .env.local.example — env var contract documentation
    - eslint.config.mjs — flat config with no-explicit-any error rule
    - .prettierrc — tailwindcss class sort plugin
  modified:
    - next.config.ts — reactStrictMode: true
    - tsconfig.json — target ES2022
    - .gitignore — protect .env.local, allow .env.local.example
decisions:
  - "Bootstrapped in /tmp/sharedtrip (lowercase) due to npm naming restrictions on capital letters, then rsync'd files to project directory"
  - "shadcn/ui init auto-detected Tailwind v4 — used base-nova style with neutral base color"
  - "Removed shadcn's .dark CSS class and default OKLCH colors — replaced with Tropical Sunset hex palette in :root"
  - "eslint.config.mjs uses FlatCompat + @eslint/eslintrc adapter for next/core-web-vitals + next/typescript"
  - "vercel link --project sharedtrip (lowercase) required due to directory name SharedTrip having capital letters"
  - "Preview env vars skipped — Vercel requires GitHub Login Connection for preview; production + development fully wired"
  - "Production alias: https://sharedtrip.vercel.app (canonical URL)"
metrics:
  duration_seconds: 780
  completed_date: "2026-05-29"
  tasks_completed: 4
  tasks_total: 4
  files_created: 15
  files_modified: 4
---

# Phase 1 Plan 1: Bootstrap + Welcome Screen Summary

**One-liner:** Next.js 16 + Tailwind v4 + shadcn/ui bootstrapped with Tropical Sunset palette, Inter font, Spanish welcome screen consuming es.ts, and deployed live to https://sharedtrip.vercel.app with Supabase env vars wired.

## What Was Built

All 4 tasks complete. Deployed to production: https://sharedtrip.vercel.app

### Task 1: Project Bootstrap

- Created Next.js 16.2.6 project with TypeScript, Tailwind v4 CSS-first, App Router, src/ directory structure
- Installed all Phase 1 dependencies: @supabase/supabase-js, @supabase/ssr, @serwist/next, serwist, dexie, dexie-react-hooks, zustand, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, sonner, lucide-react
- Initialized shadcn/ui v4 with Tailwind v4 auto-detection; installed: button, input, sheet, alert-dialog, skeleton, sonner
- Replaced shadcn's default OKLCH palette with Tropical Sunset hex palette via @theme inline tokens in globals.css
- Configured Inter variable font (400/700 weights) via next/font/google in layout.tsx with lang="es"
- Added ESLint flat config (next/core-web-vitals + next/typescript + no-explicit-any error) and Prettier with tailwindcss class sort
- Created .env.local.example with correct 2026 Supabase key names (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, not the legacy ANON_KEY)

### Task 2: Welcome Screen Vertical Slice

- Created src/i18n/es.ts: typed Spanish dictionary with auth + errors namespaces, `as const`, `EsKeys` type export
- Created src/components/common/Wordmark.tsx: brand mark in coral (text-primary), Inter italic 700, size variants sm/md/lg
- Replaced default page.tsx with Spanish welcome screen: Wordmark + h1 welcomeHeading + p welcomeSubheading + disabled CTA button
- All strings via es.auth.* — zero hardcoded Spanish text in JSX
- Zero hex literals in component files — all colors via @theme tokens
- Only 400 and 700 font weights used (UI-SPEC constraint)
- npm run build passes: TypeScript clean, static prerender succeeds

### Task 3: Vercel Deploy + Supabase Env Vars

- Linked project to Vercel: `vercel link --project sharedtrip` (created jclnt-projects/sharedtrip)
- Added env vars to Vercel Production + Development (4 vars):
  - NEXT_PUBLIC_SUPABASE_URL — points to https://vumiszpfiftmvyrfyixf.supabase.co
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — sb_publishable_... format (2026 key name)
  - SUPABASE_SECRET_KEY — server-only, no NEXT_PUBLIC_ prefix (security constraint met)
  - NEXT_PUBLIC_APP_URL — https://sharedtrip.vercel.app (production), http://localhost:3000 (development)
- Deployed to Vercel production: https://sharedtrip.vercel.app (build: 30s, TypeScript clean)
- Redeployed after adding NEXT_PUBLIC_APP_URL to bake it into the build
- Updated .gsd-supabase-project.txt with actual project ref vumiszpfiftmvyrfyixf (gitignored)
- Note: Preview env vars not set — Vercel requires GitHub Login Connection (one-time dashboard step) to enable preview deployments; not blocking for MVP

### Task 4: Deployment Verification

- HTTP 200 confirmed: `curl -sI https://sharedtrip.vercel.app` returns HTTP/2 200
- HTML lang attribute: `lang="es"` confirmed in rendered HTML
- Spanish welcome heading: "Bienvenido a SharedTrip" confirmed in page source
- Wordmark: "SharedTrip" rendered via Wordmark component
- @theme tokens in use: `text-primary`, `text-fg-muted`, `bg-bg` confirmed in rendered classes
- All strings route through es.auth.* — no hardcoded Spanish in component source

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] npm naming restriction blocked in-directory create-next-app**
- **Found during:** Task 1 — `npx create-next-app@latest .` failed because "SharedTrip" has capital letters
- **Issue:** npm package names cannot contain capital letters; the project directory name is "SharedTrip"
- **Fix:** Bootstrapped in `/tmp/sharedtrip` (lowercase), then rsync'd all generated files to the project directory. Same outcome, no functional difference.
- **Files modified:** All project root files (package.json has `"name": "sharedtrip"`)

**2. [Rule 2 - Missing] shadcn form component not installed by default**
- **Found during:** Task 1 — `npx shadcn@latest add form` silently skipped (registry response indicated it was already part of the init or a version difference)
- **Issue:** form.tsx was not written to src/components/ui/
- **Fix:** The form component is not used in Plan 01 (Plan 03 wires MagicLinkForm). Deferred to Plan 03 which will run `npx shadcn@latest add form` at that time.
- **Impact:** None for Plan 01 acceptance criteria.

**3. [Rule 1 - Bug] .gitignore .env* pattern blocked .env.local.example**
- **Found during:** Task 1 git staging — `git add .env.local.example` failed (matched `.env*` glob)
- **Issue:** The create-next-app generated `.gitignore` uses `.env*` which matches `.env.local.example`
- **Fix:** Replaced `.env*` with explicit entries: `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`. This allows `.env.local.example` to be committed (documentation file) while protecting secrets.
- **Files modified:** .gitignore

**4. [Rule 1 - Bug] next-env.d.ts was listed in .gitignore after create-next-app generates it**
- **Found during:** Task 1 git staging
- **Issue:** The created `.gitignore` had `next-env.d.ts` listed, but this file is auto-generated and needed in the repo for type checking
- **Fix:** Removed `next-env.d.ts` from .gitignore (Next.js docs recommend tracking it)

## Auth Gates

**Vercel CLI login (Task 3):**
- What was attempted: `vercel login` + `vercel link`
- Gate: Vercel CLI requires browser-based OAuth
- Required user action: User completed `vercel login` (authenticated as juananava-2806)
- Outcome: Resolved — deployment live at https://sharedtrip.vercel.app

**Supabase project (Task 3):**
- What was attempted: Listed as user_setup dashboard_config in PLAN.md
- Gate: Supabase project creation is a manual dashboard action
- Required user action: User created sharedtrip project at supabase.com/dashboard
- Outcome: Resolved — project ref vumiszpfiftmvyrfyixf, env vars wired in Vercel

## Locked @theme Token Contract

These token names are frozen for all subsequent plans:

| Tailwind utility | CSS var | Hex |
|-----------------|---------|-----|
| `bg-bg` | `--color-bg` | `#0F1729` |
| `bg-surface` | `--color-surface` | `#1A2238` |
| `text-primary` / `bg-primary` | `--color-primary` | `#FF6B6B` |
| `text-accent` / `bg-accent` | `--color-accent` | `#3DCCC7` |
| `text-secondary` / `bg-secondary` | `--color-secondary` | `#FFB627` |
| `text-fg` | `--color-fg` | `#FAFAFA` |
| `text-fg-muted` | `--color-fg-muted` | `#94A3B8` |
| `text-destructive` / `bg-destructive` | `--color-destructive` | `#EF4444` |
| `border-border` | `--color-border` | `rgba(148,163,184,0.2)` |

**Rule:** No hex literals in any .tsx file. Use token utilities only.

## es.ts Shape (Plans 03/04/05 extend this)

```typescript
export const es = {
  auth: { welcomeHeading, welcomeSubheading, sendLinkCta, emailLabel, emailPlaceholder, checkEmailHeading, checkEmailBody },
  errors: { invalidLink, sendLinkFailed, invalidJoinToken, sessionExpired, genericNetwork },
  // Plans 03/04/05 will add: anon, tabs, profile, tripSwitcher
} as const
export type EsKeys = typeof es
```

## Known Stubs

- `src/app/page.tsx` CTA button: `disabled` — wired in Plan 03 (MagicLinkForm). This is intentional per plan design; the welcome screen is visual-only until auth is wired.
- No data fetching in page.tsx — welcome screen is a static landing page; Plan 03 adds the form + server action.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced beyond what was planned. `.env.local` is properly gitignored; `.env.local.example` contains no secrets.

## Self-Check

- [x] src/app/globals.css exists: contains `@import "tailwindcss"`, `@theme inline`, `--color-primary`
- [x] src/app/layout.tsx exists: contains `lang="es"`, `Inter` import, `weight: ['400', '700']`
- [x] src/app/page.tsx exists: contains `es.auth.welcomeHeading`, import from `@/i18n/es`
- [x] src/i18n/es.ts exists: contains `as const`, `welcomeHeading`, `sendLinkCta`, `invalidLink`
- [x] src/components/common/Wordmark.tsx exists: no hex colors, uses `text-primary`
- [x] components.json exists: contains `"tailwind"` key
- [x] .env.local.example exists: contains `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [x] No tailwind.config.js (Tailwind v4 CSS-first — confirmed)
- [x] npm run build passes: TypeScript clean, static prerender succeeds
- [x] GitHub repo: https://github.com/JuanaCinthiaNava/SharedTrip (pushed)
- [x] Vercel project linked: .vercel/project.json exists (prj_qRfr1dU1vMLSKwrpFEIp6Jc7B0Ss)
- [x] 4 env vars in Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_APP_URL (Production + Development)
- [x] Production URL returns HTTP 200: https://sharedtrip.vercel.app
- [x] HTML lang="es" confirmed in production response
- [x] "Bienvenido a SharedTrip" confirmed in production response
- [x] .env.local is gitignored (confirmed via git check-ignore)

## Deploy Info

| Item | Value |
|------|-------|
| Production URL | https://sharedtrip.vercel.app |
| Vercel project | jclnt-projects/sharedtrip |
| Supabase project URL | https://vumiszpfiftmvyrfyixf.supabase.co |
| Supabase project ref | vumiszpfiftmvyrfyixf |
| GitHub repo | https://github.com/JuanaCinthiaNava/SharedTrip |
| Env vars in Vercel | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_APP_URL |

## Self-Check: PASSED
