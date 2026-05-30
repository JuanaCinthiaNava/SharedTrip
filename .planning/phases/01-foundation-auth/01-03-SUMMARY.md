---
phase: 01-foundation-auth
plan: "03"
subsystem: auth
tags: [supabase, ssr, magic-link, server-actions, middleware, react-hook-form, zod, pkce, cookies]

dependency_graph:
  requires:
    - phase: 01-01
      provides: es.ts dictionary, shadcn/ui components (Button, Input), Wordmark, welcome page
    - phase: 01-02
      provides: src/types/database.ts (Database interface for typed Supabase clients)
  provides:
    - src/lib/supabase/client.ts — createBrowserClient factory for 'use client' components
    - src/lib/supabase/server.ts — async createServerClient factory using await cookies()
    - src/lib/supabase/middleware.ts — updateSession() with getUser() (not getSession())
    - src/middleware.ts — root middleware refreshing sessions on every request
    - src/actions/auth.ts — sendMagicLink + signOut server actions
    - src/app/auth/callback/route.ts — PKCE code exchange + T-03-06 open-redirect guard
    - src/app/auth/check-email/page.tsx — Spanish confirmation screen (Server Component)
    - src/components/auth/MagicLinkForm.tsx — RHF + Zod email form with server action
    - src/components/ui/form.tsx — shadcn-compatible form primitives (no @radix-ui dependency)
  affects:
    - 01-04 (anonymous join uses createClient from server.ts + the cookie session pattern)
    - 01-05 (Perfil tab uses signOut server action; header uses createClient to detect anonymous status)
    - All future plans that need authenticated server-side Supabase access use server.ts factory
    - All future plans that need client-side Supabase calls use client.ts factory

tech-stack:
  added: []  # No new packages — all were installed in Plan 01
  patterns:
    - "@supabase/ssr three-file client factory (client/server/middleware) — canonical pattern for all Supabase access"
    - "Server Actions for auth mutations (sendMagicLink, signOut) — never client-side Supabase mutations"
    - "Route Handler for PKCE callback (exchangeCodeForSession) — cookie-based session establishment"
    - "React Hook Form + Zod + zodResolver — form validation pattern for MagicLinkForm and all future forms"
    - "useTransition wrapping server action calls — non-blocking UI with isPending spinner state"
    - "FormControl via React.cloneElement — injects id/aria props without @radix-ui/react-slot dependency"

key-files:
  created:
    - src/lib/supabase/client.ts — createBrowserClient<Database> — Plans 04/05 import this
    - src/lib/supabase/server.ts — createServerClient with await cookies() — Plans 04/05 import this
    - src/lib/supabase/middleware.ts — updateSession() with getUser() for session refresh
    - src/middleware.ts — root Next.js middleware (excludes static assets via matcher config)
    - src/actions/auth.ts — sendMagicLink(email) + signOut() server actions
    - src/app/auth/callback/route.ts — PKCE GET handler with T-03-06 open-redirect validation
    - src/app/auth/check-email/page.tsx — async searchParams, error state inline alert, back link
    - src/components/auth/MagicLinkForm.tsx — RHF mode 'onBlur', Loader2 spinner, sonner toast
    - src/components/ui/form.tsx — Form/FormField/FormItem/FormLabel/FormControl/FormMessage primitives
  modified:
    - src/app/page.tsx — removed disabled button placeholder; wires <MagicLinkForm /> in bottom third
    - src/types/database.ts — removed spurious 'Initialising login role...' CLI stdout on line 1

key-decisions:
  - "Simple approach per Pitfall 5: signInWithOtp + Supabase dashboard template, NOT admin.generateLink() + Resend SDK"
  - "Anti-pattern enforced: getUser() only in middleware, never getSession() server-side"
  - "T-03-06 mitigation: open-redirect guard validates ?next param is relative path before NextResponse.redirect"
  - "FormControl implemented via React.cloneElement instead of @radix-ui/react-slot (not installed; shadcn used @base-ui/react)"
  - "Form component written manually (npx shadcn add form silently skipped per Plan 01 deviation note)"

patterns-established:
  - "Three-file Supabase factory: always import createClient from the right factory based on execution context"
  - "Server Action pattern: 'use server', returns { error: string | null }, never throws"
  - "Callback route pattern: validate next param before redirect (T-03-06); redirect to /auth/check-email?error= on failure"
  - "es.ts-only Spanish: MagicLinkForm and check-email page have zero hardcoded Spanish strings"

requirements-completed:
  - AUTH-01
  - AUTH-02
  - AUTH-03

duration: ~25min
completed: "2026-05-29"
---

# Phase 01 Plan 03: Magic Link Auth Vertical Slice Summary

**@supabase/ssr cookie-based session factory with PKCE magic-link flow: email form on `/` → server action → Supabase OTP → `/auth/callback` exchanges code for cookie session → Spanish confirmation at `/auth/check-email`**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-29T (execution start)
- **Completed:** 2026-05-29
- **Tasks:** 3 auto tasks complete (Task 4 is a blocking human-verify checkpoint)
- **Files modified/created:** 11

## Accomplishments

- @supabase/ssr three-file client factory (client/server/middleware) — the canonical session pattern all future plans inherit
- Root middleware refreshing JWT cookies on every request via `getUser()` (not `getSession()` — anti-pattern enforced)
- MagicLinkForm: RHF + Zod validation, `mode: 'onBlur'`, Loader2 spinner, Sonner toast on error
- PKCE callback route with mandatory T-03-06 open-redirect guard (`?next=//evil.com` → `/`)
- Spanish `/auth/check-email` server component with async searchParams + inline error alert for invalid links
- Fixed spurious 'Initialising login role...' CLI stdout contaminating `src/types/database.ts` (was causing TypeScript parse error)

## Task Commits

1. **Task 1: @supabase/ssr factory + root middleware** — `5dd9fe9` (feat)
2. **Task 2: Server action + callback + check-email** — `5e8026f` (feat)
3. **Task 3: MagicLinkForm + wire welcome page** — `75ad3f0` (feat)

## Files Created/Modified

- `src/lib/supabase/client.ts` — `createBrowserClient<Database>` — Plans 04/05 import this
- `src/lib/supabase/server.ts` — async `createServerClient` with `await cookies()` — Plans 04/05 import this
- `src/lib/supabase/middleware.ts` — `updateSession()` calling `getUser()` (JWT revalidation, not getSession)
- `src/middleware.ts` — root middleware with matcher excluding static assets + images
- `src/actions/auth.ts` — `sendMagicLink(email)` + `signOut()` — `'use server'` directive
- `src/app/auth/callback/route.ts` — PKCE GET handler; T-03-06 guard; redirects to check-email on error
- `src/app/auth/check-email/page.tsx` — Server Component; async searchParams; inline error; all strings via es.*
- `src/components/auth/MagicLinkForm.tsx` — `'use client'`; RHF + Zod; `useTransition` + server action
- `src/components/ui/form.tsx` — Form primitives (manual; shadcn CLI skipped this component)
- `src/app/page.tsx` — replaced disabled button with `<MagicLinkForm />`
- `src/types/database.ts` — removed CLI stdout contamination (line 1)

## Decisions Made

- **Simple approach (Pitfall 5):** `signInWithOtp` + Supabase dashboard email template (subject `Acceso a tu viaje · {{ .Token }}`). Did NOT use `admin.generateLink()` + Resend SDK — that would require the service role key client-side and a custom mail route.
- **`getUser()` only:** Never `getSession()` in middleware or server factories — `getUser()` revalidates JWT server-to-server; `getSession()` reads stale local cookie.
- **T-03-06 open-redirect:** Guard is inline in callback route before `NextResponse.redirect`. Validates `next` starts with `/` AND not `//`.
- **FormControl via `React.cloneElement`:** shadcn installed with `@base-ui/react` primitives (not `@radix-ui`). Wrote a `cloneElement`-based FormControl that injects `id`/`aria-*` into the direct child element.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed CLI stdout contamination from src/types/database.ts**
- **Found during:** Task 1 — first `npm run build` after creating lib/supabase files
- **Issue:** `src/types/database.ts` had `Initialising login role...` as line 1 (Supabase CLI stdout mixed into file during generation in Plan 02). TypeScript could not parse the file.
- **Fix:** Removed the spurious first line. File now starts with `export type Json =`.
- **Files modified:** `src/types/database.ts`
- **Verification:** `npm run build` passes TypeScript check after removal.
- **Committed in:** `5dd9fe9` (Task 1 commit)

**2. [Rule 3 - Blocking] shadcn form component not installed; wrote it manually**
- **Found during:** Task 3 planning — `form.tsx` was missing from `src/components/ui/`
- **Issue:** Plan 01 deviation note documented that `npx shadcn@latest add form` silently skipped. Without `form.tsx`, MagicLinkForm cannot be built.
- **Fix:** Wrote `src/components/ui/form.tsx` manually using react-hook-form's `FormProvider` + `Controller`. Used `React.cloneElement` instead of `@radix-ui/react-slot` (not installed; shadcn used `@base-ui/react`).
- **Files modified:** `src/components/ui/form.tsx` (created)
- **Verification:** Build passes; `FormControl` correctly injects `id`/`aria-*` via cloneElement.
- **Committed in:** `5e8026f` and `75ad3f0` (Tasks 2-3 commits)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness and build success. No scope creep.

## Issues Encountered

- `@base-ui/react` primitives: shadcn v4 init chose `@base-ui/react` over `@radix-ui/react` — this is the 2026 shadcn default. FormControl had to use `React.cloneElement` instead of Radix's `Slot` component. Works correctly for the single-child form control pattern.

## User Setup Required (Blocking for End-to-End Verification)

The code is complete. The following dashboard steps are required before the Task 4 checkpoint verification passes:

**1. Create Resend account and configure Supabase SMTP:**
- Create account at https://resend.com (free tier — 3K emails/month)
- Add and verify a sending domain (add SPF + DKIM records at your DNS provider)
- Generate a Resend API key (`re_...`)
- Configure Supabase custom SMTP: Dashboard → Authentication → SMTP Settings
  - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: `{RESEND_API_KEY}`
  - Sender name: `Cristian (SharedTrip)`, Sender email: `cristian@{verified-domain}`

**2. Configure Supabase email template (anti-Gmail-threading):**
- Dashboard → Authentication → Email Templates → Magic Link
- Subject EXACTLY: `Acceso a tu viaje · {{ .Token }}`
- Body: See CONTEXT.md D-04 for full copy. Include a `Solicitado a las {{ .Date }}` line above the CTA.
- CTA button: `Entrar a SharedTrip` (coral background)
- Footer: `El enlace expira en 15 minutos. Si no lo solicitaste, ignora este correo.`

**3. Configure Supabase redirect URLs:**
- Dashboard → Authentication → URL Configuration
- Site URL: `https://sharedtrip.vercel.app`
- Redirect URLs (add both):
  - `https://sharedtrip.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

**4. Set RESEND_API_KEY in Vercel:**
- Vercel Dashboard → sharedtrip → Settings → Environment Variables
- Add `RESEND_API_KEY` = `{your-key}` (server-only, no NEXT_PUBLIC_ prefix)

## Auth Cookie Structure (Plans 04/05 Reference)

Supabase `@supabase/ssr` stores session in split cookies when the JWT exceeds 4KB:
- `sb-{project-ref}-auth-token.0` — first chunk
- `sb-{project-ref}-auth-token.1` — second chunk (if needed)

Or a single cookie:
- `sb-{project-ref}-auth-token`

Cookie properties set by `@supabase/ssr`: `HttpOnly`, `Secure` (in production), `SameSite=Lax`, `Path=/`.

Project ref: `vumiszpfiftmvyrfyixf`

## Known Stubs

None — all code paths are wired. The Resend SMTP configuration (user_setup) is the only gap before end-to-end testing passes.

## Threat Flags

No new threat surface beyond the plan's threat model. T-03-06 open-redirect mitigation is implemented in `src/app/auth/callback/route.ts` as required.

## Next Phase Readiness

- **Plan 04 (anonymous join):** All three Supabase factories are available. `sendMagicLink` and `signOut` server actions are exported. The session cookie pattern is established. Plan 04 adds `signInAnonymously()` server-side via the server factory.
- **Plan 05 (app shell):** `signOut()` from `src/actions/auth.ts` is ready for the AlertDialog in the Perfil tab. The browser factory (`createClient` from `client.ts`) is available for client-side user detection.
- **Blocker before checkpoint:** Resend SMTP + email template + redirect URLs must be configured in Supabase dashboard before Task 4 verification can pass.

## Self-Check: PASSED

- [x] src/lib/supabase/client.ts exists: contains `createBrowserClient`
- [x] src/lib/supabase/server.ts exists: contains `createServerClient` + `await cookies()`
- [x] src/lib/supabase/middleware.ts exists: contains `getUser()`, no `getSession()`
- [x] src/middleware.ts exists: imports `updateSession`, exports `config.matcher`
- [x] src/actions/auth.ts exists: contains `'use server'`, exports `sendMagicLink` + `signOut`
- [x] src/app/auth/callback/route.ts exists: contains `exchangeCodeForSession` + T-03-06 guard
- [x] src/app/auth/check-email/page.tsx exists: Server Component, uses `es.auth.checkEmailHeading`
- [x] src/components/auth/MagicLinkForm.tsx exists: `'use client'`, `useForm`, `zodResolver`, `sendMagicLink`
- [x] src/components/ui/form.tsx exists: `Form`, `FormField`, `FormControl`, `FormMessage`
- [x] src/app/page.tsx: contains `<MagicLinkForm />`, no disabled button placeholder
- [x] No NEXT_PUBLIC_SUPABASE_ANON_KEY in any supabase factory file
- [x] No .auth.getSession() in middleware files
- [x] No hardcoded Spanish in MagicLinkForm.tsx or check-email/page.tsx
- [x] No admin.generateLink() in auth.ts
- [x] T-03-06 guard confirmed in callback/route.ts: `next.startsWith('//')`
- [x] Commits exist: 5dd9fe9, 5e8026f, 75ad3f0
- [x] npm run build: TypeScript clean, all routes prerendered/dynamic correctly
