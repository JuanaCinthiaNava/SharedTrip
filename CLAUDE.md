<!-- GSD:project-start source:PROJECT.md -->
## Project

**SharedTrip**

SharedTrip es una webapp PWA en español, hub central para organizar viajes y eventos grupales. Cada viaje vive en un link compartible — sin descargas, sin fricción para invitar — donde el grupo guarda boletos, itinerario, gastos y ubicaciones de forma estructurada, en lugar de perderlos en chats de WhatsApp y screenshots. Construida inicialmente para uso personal con un círculo cercano.

**Core Value:** **Recuperar al instante el boleto/reservación correcto cuando lo necesitas — incluso sin internet.** Si esto falla, la app falla. Todo lo demás (itinerario, gastos, mapa) es valor incremental sobre esta bóveda confiable.

### Constraints

- **Timeline**: v1 debe estar funcional antes del próximo viaje (< 1 mes desde hoy, 2026-05-29) — Hay deadline real, no aspiracional.
- **Plataforma**: Web responsive + PWA — Cero fricción para invitar al grupo (sin descargas de app stores).
- **Idioma**: Solo español en UI — Reduce overhead de i18n; el círculo objetivo es hispanohablante.
- **Hosting**: Cloud serverless con tier gratuito alcanzable — Personal project, sin presupuesto operativo.
- **Auth**: Magic link / passwordless — Cero contraseñas, mínima fricción para amigos.
- **Offline**: La bóveda de documentos debe funcionar sin internet — Pain point crítico (aeropuertos, roaming caro).
- **Solo dev**: Una persona construyendo en tiempo limitado — Stack debe optimizar velocidad de iteración, no robustez enterprise.
- **Stack moderno 2026**: Sin apego previo a tecnología — La investigación define recomendación óptima (probable: Next.js + Supabase + Vercel + Tailwind, a confirmar).
- **Privacidad**: Boletos contienen información personal (nombre, código de boleto, código QR) — Acceso restringido a miembros del evento. Sin compartir datos a terceros.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x (latest: ~16.2.6) | Full-stack React framework | App Router is the 2026 standard. Built-in manifest support for PWA, Server Components reduce JS bundle, Server Actions simplify API layer. Largest ecosystem for solo devs — answers exist. Official Vercel DX is unmatched for free-tier deployment. |
| TypeScript | 5.x | Type safety across full stack | Non-negotiable for solo dev: catches shape mismatches between Supabase types and UI without a second pair of eyes. Supabase generates types from schema. Zero runtime cost. |
| Tailwind CSS | v4.3 | Utility-first CSS | v4 is CSS-first configuration (no JS config file), 5x faster builds, OKLCH colors. Required: shadcn/ui v4 components use it. Spotify/Duolingo vibe is achievable through custom @theme tokens. |
| shadcn/ui | current (v4-compatible) | Component library | Not an npm package — CLI copies source into your project. Full Tailwind v4 + React 19 support. Accessible primitives (Radix UI). Best for customization: you own the component code. Gives the polished, modern look required without fighting a design system. |
| Supabase | JS client @supabase/supabase-js ^2.x + @supabase/ssr | BaaS: DB, Auth, Storage, Realtime | Single platform covers every backend need: PostgreSQL, magic link auth, file storage, realtime subscriptions. Open source, EU data residency available. Free tier covers MVP scale. The alternative (Firebase) is NoSQL and has weaker SQL querying for itinerary/expense data. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Serwist (@serwist/next) | latest (~9.x) | PWA service worker + Workbox | **Required for offline document access.** next-pwa is unmaintained and broken with Next.js 16 Turbopack. Serwist is the actively-maintained successor, works with Turbopack, and provides cache-first strategies for static assets. |
| Dexie.js | ^4.4.2 | IndexedDB wrapper for offline document cache | Cache downloaded PDF/image blobs locally so they are readable without network. Provides `useLiveQuery` React hook for reactive rendering from local store. Required for "boletos offline en aeropuerto" — the core value prop. |
| Zustand | ^5.x | Client-side UI state | Tiny (~3 KB), zero boilerplate. Use only for transient UI state that isn't server data (e.g., modal open/closed, active trip in sidebar). Do not use for server-fetched data. |
| TanStack Query | v6.x | Server state / API cache | Handles Supabase fetch caching, background refetch, loading/error states. Pair with Zustand: TanStack Query owns server state, Zustand owns UI state. |
| React Hook Form + Zod | rhf ^7.x, zod ^3.x | Form validation | 2026 standard combo. Zod schemas are shared between client validation and Supabase insert types. Zero re-renders on keystroke. Use for upload form, invite form, itinerary entry. |
| @hookform/resolvers | ^3.x | Bridge RHF ↔ Zod | Required adapter for the RHF + Zod pattern. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Vercel CLI | Deploy + preview branches | `vercel dev` for local HTTPS (needed for service worker testing). Zero config with Next.js. |
| Supabase CLI | Local Supabase dev environment + migrations | Run `supabase start` for local Postgres + Auth + Storage. Type generation: `supabase gen types typescript`. |
| ESLint + Prettier | Code quality | Use `eslint-config-next` (ships with Next.js). Add `prettier-plugin-tailwindcss` to auto-sort class names. |
## Free Tier Cost Estimate at MVP Scale
| Service | Free Tier Limits | Expected Usage at MVP | Cost |
|---------|-----------------|----------------------|------|
| Vercel (Hobby) | 100 GB bandwidth, 1M function invocations/mo | <1 GB bandwidth, <1K invocations | $0 |
| Supabase (Free) | 500 MB DB, 1 GB file storage, 50K MAU, 200 realtime connections, 2M realtime messages/mo | <10 MB DB, <500 MB storage (50 PDFs × ~10 MB), <10 users | $0 |
| Supabase Auth | 50K monthly active users | <10 users | $0 |
## Offline Strategy (Critical Path)
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Firebase | NoSQL Firestore is awkward for relational trip/member/itinerary data. Vendor lock-in to Google. Magic links require third-party (e.g., Firebase Auth + custom SMTP). Weaker type generation. | Supabase (PostgreSQL, open source, magic links built-in) |
| Convex | Real-time TypeScript-native but requires Convex's proprietary reactive query model — steep learning curve for solo dev under 1-month deadline. Smaller community = fewer answers when stuck. | Supabase (standard SQL + REST + realtime is well-documented) |
| PocketBase | Self-hosted only. Requires a VPS ($5+/mo). No free managed tier. DevOps overhead incompatible with solo dev timeline. | Supabase (fully managed free tier) |
| next-pwa (shadowwalker) | Last updated 2+ years ago. **Broken with Next.js 16 Turbopack** — requires `--webpack` flag for all commands. Unmaintained. | Serwist (@serwist/next) — actively maintained, Turbopack-compatible |
| Plain React (Vite/CRA) | No SSR, no App Router, no Server Actions. PWA setup is manual. No built-in manifest support. More boilerplate for the same end result. | Next.js 16 App Router |
| SvelteKit | Smaller ecosystem = fewer UI libraries, fewer magic link examples, fewer offline-first patterns documented. Solo dev under deadline needs Stack Overflow depth. Superior performance doesn't matter at <10 users. | Next.js (community depth is the deciding factor for a tight solo-dev timeline) |
| Redux / Redux Toolkit | Massive boilerplate, overkill. SharedTrip has minimal client state that isn't server data. | Zustand (3 KB, zero ceremony) |
| DaisyUI | 30+ themes is appealing but React-only work is limited, and achieving the specific Spotify/Duolingo "vibrant" aesthetic requires fighting DaisyUI's opinionated theme system. shadcn/ui gives full control with the same Tailwind base. | shadcn/ui + Tailwind v4 custom @theme tokens |
| Tailwind CSS v3 | v4 is the current standard as of 2026. shadcn/ui's new components ship as v4. Starting a greenfield project on v3 means a migration cost before reaching v4 benefits. | Tailwind CSS v4.3 |
| i18n libraries (next-intl, etc.) | Project is Spanish-only in v1. Adding i18n infrastructure is scope creep. Hardcode Spanish strings. | Hardcoded Spanish text in components |
## Alternatives Considered
| Category | Recommended | Alternative | When Alternative Makes Sense |
|----------|-------------|-------------|-------------------------------|
| Frontend | Next.js 16 | SvelteKit 2 | When bundle size and raw performance are the top priority and team has Svelte experience |
| BaaS | Supabase | Convex | When the app is TypeScript-native real-time first and team has 2+ months to ramp up |
| BaaS | Supabase | Firebase | When building a Google ecosystem mobile-first app |
| PWA Service Worker | Serwist | Manual service worker | When you need precise control over caching strategy and want no abstraction overhead |
| Local Storage | Dexie.js | idb-keyval | When only storing a handful of simple key-value settings (not blobs or queryable data) |
| UI Components | shadcn/ui | Radix UI (naked) | When you want zero pre-styling and build every visual from scratch |
| State | Zustand | Jotai | When component-level atomic state is more natural than a central store |
| Hosting | Vercel | Cloudflare Pages | When you need unlimited bandwidth and are willing to handle Cloudflare's partial Next.js compatibility edge cases |
## Installation
# Bootstrap Next.js 16 with TypeScript + Tailwind v4 + App Router
# Core: Supabase client (SSR-safe)
# PWA / Offline
# State management
# Forms and validation
# UI components (shadcn/ui — run after install)
# Dev dependencies
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.x | React 19.2, Tailwind v4.3, shadcn/ui (v4 branch) | Use App Router. Pages Router deprecated path. |
| @serwist/next | Next.js 16.x + Webpack (dev requires `--experimental-https` for service worker testing) | Turbopack works in prod builds; `next dev --experimental-https --webpack` for local SW testing |
| @supabase/ssr | Next.js 16 App Router, @supabase/supabase-js ^2 | Replaces deprecated `@supabase/auth-helpers-nextjs` |
| shadcn/ui (v4) | Tailwind v4.3, React 19, Next.js 16 | Initialize with `npx shadcn@latest init`; picks v4 config automatically |
| Dexie 4.4.x | React 18+/19, all modern browsers | `useLiveQuery` from `dexie-react-hooks`; experimental Suspense hooks available |
| Tailwind v4.3 | PostCSS via `@tailwindcss/postcss`, no JS tailwind.config.js | CSS-first `@import "tailwindcss"` in globals.css; custom theme via `@theme {}` |
## Sources
- [Next.js 16 Official PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — verified 2026-05-28, confirms Serwist as official offline recommendation
- [Supabase Pricing (official)](https://supabase.com/pricing) — verified free tier: 1 GB storage, 500 MB DB, 50K MAU, 200 realtime connections
- [Supabase Auth: Magic Link Docs](https://supabase.com/docs/guides/auth/auth-email-passwordless) — confirmed magic link is native, 1-hour expiry
- [Supabase SSR + Next.js Docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — confirmed `@supabase/ssr` replaces deprecated auth-helpers
- [Serwist Getting Started](https://serwist.pages.dev/docs/next/getting-started) — confirmed as maintained next-pwa successor for Next.js 16
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — confirmed v16.2.6 as of May 2026
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) — confirmed CSS-first architecture, v4.3 current
- [shadcn/ui Tailwind v4 Migration](https://ui.shadcn.com/docs/tailwind-v4) — confirmed full v4 + React 19 support
- [Vercel Pricing](https://vercel.com/pricing) — confirmed 100 GB bandwidth, 1M invocations on Hobby
- [Dexie.js npm](https://www.npmjs.com/package/dexie) — confirmed v4.4.2 current as of May 2026
- [Supabase pause prevention via GitHub Actions](https://dev.to/jps27cse/how-to-prevent-your-supabase-project-database-from-being-paused-using-github-actions-3hel) — MEDIUM confidence (community article, pause behavior confirmed via official pricing page)
- SvelteKit vs Next.js 2026 comparison — [prismic.io](https://prismic.io/blog/sveltekit-vs-nextjs), [teta.so](https://teta.so/learn/sveltekit-vs-nextjs) — MEDIUM confidence (community sources, ecosystem argument holds)
- Supabase vs Convex vs Firebase — [cadence.withremote.ai](https://cadence.withremote.ai/blog/convex-vs-supabase-vs-firebase), [vibestack.io](https://www.vibestack.io/blog/supabase-vs-firebase-vs-convex-2026) — MEDIUM confidence
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
