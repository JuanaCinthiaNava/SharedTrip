# Phase 2: Trip + Member Management - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 18 (8 new, 7 modified, 2 new tests, 1 CLI-generated primitive)
**Analogs found:** 16 / 18 (2 new shadcn primitives have no in-repo analog → use RESEARCH/CLI)

> Brownfield phase extending Phase 1. Every hard problem has a verbatim in-repo precedent. The dominant directive: **reuse, do not invent.** Anchor each new file to the analog cited below and copy its structure.

---

## File Classification

| New/Modified File | New/Mod | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|---------|------|-----------|----------------|---------------|
| `src/actions/trips.ts` | NEW | server action | CRUD (create/update/delete) | `src/actions/members.ts` | exact (same service-role + anon-session pattern) |
| `src/actions/members.ts` (add `removeMember`, `leaveTrip`) | MOD | server action | CRUD (delete) | `src/actions/members.ts` (`joinTripByCode`) | exact (same file, simpler — plain RLS) |
| `src/app/trips/new/route.ts` (or chosen route) | NEW | route handler | request-response (cookie write) | `src/app/join/[code]/route.ts` | exact |
| `src/lib/utils/invite-code.ts` (add `generateInviteCode`) | MOD | utility | transform (pure fn) | `src/lib/utils/invite-code.ts` | exact (same file) |
| `src/lib/utils/invite-code.test.ts` (add gen cases) | MOD | test | — | `src/lib/utils/invite-code.test.ts` + `avatar.test.ts` | exact |
| `src/lib/utils/date-format.ts` | NEW | utility | transform (pure fn) | `src/lib/utils/avatar.ts` | role-match (pure deterministic util) |
| `src/lib/utils/date-format.test.ts` | NEW | test | — | `src/lib/utils/avatar.test.ts` | exact |
| `src/components/trip/CreateTripForm.tsx` | NEW | component (form) | request-response | `src/components/auth/InviteCodeForm.tsx` + `ProfileNameEditor.tsx` | exact (RHF+Zod) |
| `src/components/trip/TripDatePicker.tsx` | NEW | component | event-driven (onChange) | — (no analog) | NO ANALOG → RESEARCH Pattern 3 |
| `src/components/trip/DeleteTripDialog.tsx` | NEW | component | event-driven | `src/components/ui/alert-dialog.tsx` + `ProfileNameEditor` (controlled input) | role-match |
| `src/components/members/MemberList.tsx` | NEW | component (RSC-fed) | CRUD-read | `src/app/t/[tripId]/gente/page.tsx` (data shape) | role-match |
| `src/components/members/MemberRow.tsx` | NEW | component | event-driven | `src/components/profile/UserAvatar.tsx` (avatar+name) | role-match |
| `src/components/members/InviteCard.tsx` | NEW | component | event-driven (clipboard) | `InviteCodeForm.tsx` (sonner+client) | role-match → RESEARCH Pattern 6 |
| `src/app/t/[tripId]/gente/page.tsx` | MOD (REPLACE) | RSC page | CRUD-read | `src/app/t/[tripId]/layout.tsx` (RSC fetch+RLS) | exact (data-loading) |
| `src/components/layout/TripSwitcherSheet.tsx` | MOD (wire button) | component | request-response | `src/components/layout/TripSwitcherSheet.tsx` | exact (same file) |
| `src/app/page.tsx` | MOD (two-choice) | RSC page | request-response | `src/app/page.tsx` | exact (same file) |
| `src/i18n/es.ts` (add `trip`/`members`/`invite`) | MOD | config (dictionary) | — | `src/i18n/es.ts` | exact (same file) |
| `src/components/ui/calendar.tsx` | NEW (CLI) | UI primitive | — | — (no analog) | NO ANALOG → `npx shadcn add calendar` |
| `src/components/ui/textarea.tsx` | NEW (CLI, if absent) | UI primitive | — | `src/components/ui/input.tsx` | role-match → `npx shadcn add textarea` |

> UI primitives confirmed present (`ls src/components/ui/`): `alert-dialog`, `button`, `form`, `input`, `sheet`, `skeleton`, `sonner`. **`calendar` and `textarea` are NOT present** — install via CLI.

---

## Pattern Assignments

### `src/actions/trips.ts` (NEW — server action, CRUD)

**Analog:** `src/actions/members.ts` (`joinTripByCode`, lines 40-105). This is the single most important analog in the phase — `createTrip` has the *identical* in-request session-propagation constraint and must reuse the service-role bounded-mutation pattern verbatim.

**`'use server'` + imports** (`members.ts` lines 1-14):
```typescript
'use server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import type { Database } from '@/types/database'
// ADD for trips.ts: import { generateInviteCode } from '@/lib/utils/invite-code'
```

**Identity-from-server-session (never client input)** (`members.ts` lines 43-69) — copy this block into `createTrip`:
```typescript
const supabase = await createClient()
const { data: { user: existingUser } } = await supabase.auth.getUser()
let userId = existingUser?.id
if (!existingUser) {
  const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()
  if (anonErr || !anonData.user) return { tripId: null, error: es.errors.genericNetwork }
  userId = anonData.user.id
}
if (!userId) return { tripId: null, error: es.errors.genericNetwork }
```
> NOTE the load-bearing comment at `members.ts:48-53`: do NOT short-circuit on a `getUser()` error — that broke re-join after sign-out. `createTrip` must follow the same non-bailing logic.

**Service-role client construction** (`members.ts` lines 86-90) — copy exactly, including the env var name:
```typescript
const admin = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,   // server-only — do NOT invent SUPABASE_SERVICE_ROLE_KEY
  { auth: { persistSession: false, autoRefreshToken: false } }
)
```

**Membership upsert (idempotent)** (`members.ts` lines 92-102) — the creator's `role: 'admin'` insert mirrors this exactly (change `'member'` → `'admin'`):
```typescript
const { error: upsertErr } = await admin
  .from('trip_members')
  .upsert(
    { trip_id: resolvedTripId, user_id: userId, role: 'member' },  // createTrip: role: 'admin'
    { onConflict: 'trip_id,user_id', ignoreDuplicates: true }
  )
if (upsertErr) { /* console.error + return genericNetwork */ }
```

**New logic for `createTrip` (no analog — from RESEARCH Pattern 1, lines 202-224):** the `trips` INSERT (also via the service-role `admin` client, `created_by = userId`) wrapped in a 5-attempt collision-retry loop; only retry on `error.code === '23505'` (unique_violation), bubble all other errors as `genericNetwork`. See RESEARCH Pitfall 3.

**For `updateTrip` / `deleteTrip` (NEW in same file):** these run under **normal RLS** (creator-only UPDATE/DELETE policies already authorize) — do **NOT** use the service-role `admin` client. Use the plain `await createClient()` supabase client + `.update()` / `.delete().eq('id', tripId)`. Return `{ error }` shape. After mutation the *caller* runs `revalidatePath` + `router.refresh()` (no realtime — RESEARCH Open Q1).

---

### `src/actions/members.ts` — ADD `removeMember`, `leaveTrip` (MOD — server action, CRUD-delete)

**Analog:** the same file's existing structure. These are SIMPLER than `joinTripByCode` — they need **no service-role client**, because the `trip_members` DELETE RLS policy already authorizes "admin removes member" and "member leaves self" under the live session.

**Pattern to copy** (imports + `{ error }` return shape from lines 1-14 and 99-104):
```typescript
export async function leaveTrip(tripId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: es.errors.sessionExpired }
  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', user.id)          // self-leave; RLS enforces this anyway
  if (error) return { error: es.errors.genericNetwork }
  return { error: null }
}
// removeMember(tripId, targetUserId): same shape, .eq('user_id', targetUserId);
//   admin-remove RLS authorizes; identity-of-actor still from getUser(), target id is a row key.
```

---

### `src/app/trips/new/route.ts` (NEW — route handler, request-response)

**Analog:** `src/app/join/[code]/route.ts` (full file, lines 1-49). Trip creation needs a **route handler** for the same reason join does: `signInAnonymously()` must WRITE the session cookie, which is only allowed in a Route Handler or Server Action — never during RSC render (see `join/[code]/route.ts:2-5`).

> **Discretion note (CONTEXT line 67 / RESEARCH line 17):** the planner may instead make create a pure Server Action invoked from the client form. Either is valid; if a route handler, copy the structure below. If the form posts `name/dates/desc`, prefer a POST handler reading the body (the GET analog reads a path param).

**Structure to copy** (lines 10-48):
```typescript
import { NextResponse } from 'next/server'
import { createTrip } from '@/actions/trips'
import { es } from '@/i18n/es'

export async function POST(request: Request): Promise<Response> {
  const { origin } = new URL(request.url)
  const body = await request.json()            // { name, startDate, endDate, description }
  // (optional) re-validate name length server-side before createTrip
  const result = await createTrip(body)
  if (result.error || !result.tripId) {
    const errorMsg = result.error ?? es.errors.genericNetwork
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorMsg)}`)
  }
  return NextResponse.redirect(`${origin}/t/${result.tripId}/gente`)  // or /docs
}
```
The success redirect target mirrors `join/[code]/route.ts:48` (`/t/${tripId}/docs`); CONTEXT suggests `/gente` so the creator immediately sees the invite card.

---

### `src/lib/utils/invite-code.ts` — ADD `generateInviteCode` (MOD — utility, transform)

**Analog:** the same file. `CODE_RE` (line 15) is the contract the new generator MUST satisfy: `/^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/`. Output is uppercase so it round-trips through `normalizeInviteCode` (lines 22-24) and the DB resolver unchanged.

**Existing contract to honor:**
```typescript
export const CODE_RE = /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/   // prefix 2–8, suffix 3–6
export function normalizeInviteCode(raw: string): string { return raw.trim().toUpperCase() }
```

**New function (RESEARCH Pattern 2, lines 247-265):** prefix = first ~4 alpha chars of name (uppercased, non-alpha stripped, pad to ≥2 if name yields <2 letters); `-`; 4 chars from the unambiguous alphabet `'ABCDEFGHJKMNPQRSTUVWXYZ23456789'` (excludes O/I/L/0/1 per D-06). The padding branch is the regression risk — must always emit a `CODE_RE`-valid string.

---

### `src/lib/utils/invite-code.test.ts` — ADD `generateInviteCode` cases (MOD — test)

**Analog:** the same file (lines 1-95) for structure (`describe`/`it`/`expect`, vitest, pure-fn, no Supabase) + `avatar.test.ts` for the property-based / distribution style.

**Required new cases** (RESEARCH Wave 0, line 544): generated code matches `CODE_RE`; suffix never contains `O/I/L/0/1`; 1-char name pads correctly; prefix strips non-alpha. Copy the import + describe shape from lines 1-11:
```typescript
import { describe, it, expect } from 'vitest'
import { generateInviteCode, CODE_RE } from './invite-code'

describe('generateInviteCode', () => {
  it('always produces a CODE_RE-valid code', () => {
    for (let i = 0; i < 500; i++) expect(CODE_RE.test(generateInviteCode('Cancún 2026'))).toBe(true)
  })
  // + alphabet-exclusion, short-name-padding, non-alpha-strip cases
})
```

---

### `src/lib/utils/date-format.ts` (NEW — utility, transform)

**Analog:** `src/lib/utils/avatar.ts` (lines 1-51) for the shape of a pure deterministic util module (top-of-file comment warning tests pin behavior, named `export function`s, no React). The content itself is NEW — from RESEARCH Patterns 4 & 5.

**Pattern from avatar.ts to mirror** (module-level comment + pure exports):
```typescript
// Sourced from .planning/phases/02-.../02-RESEARCH.md Patterns 4 & 5.
// Single source of truth for es-MX trip dates. Do NOT use .toISOString()/new Date(str)
// (UTC off-by-one in es-MX UTC-6) — see RESEARCH Pitfall 2.
const FMT = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
export function toLocalDateString(d: Date): string { /* RESEARCH lines 311-313 */ }
export function parseLocalDate(s: string): Date { /* RESEARCH lines 315-318 */ }
export function formatTripRange(start: string | null, end: string | null): string | null { /* lines 326-331 */ }
```
> CRITICAL (RESEARCH Pitfall 2): use `parseLocalDate` for reading `YYYY-MM-DD` columns and `toLocalDateString` for serializing picked dates. Never `.toISOString()`.

---

### `src/lib/utils/date-format.test.ts` (NEW — test)

**Analog:** `src/lib/utils/avatar.test.ts` (lines 1-2, 20-27) — vitest, node env, pure-fn, `describe`/`it`/`expect`, fixed-input snapshot style:
```typescript
import { describe, it, expect } from 'vitest'
import { formatTripRange, toLocalDateString, parseLocalDate } from './date-format'
```
**Required cases** (RESEARCH lines 534-535): single / range / cross-month / cross-year / both-null → `null`; round-trip `toLocalDateString(parseLocalDate('2026-06-05')) === '2026-06-05'` with NO UTC day shift.

---

### `src/components/trip/CreateTripForm.tsx` (NEW — component, form, request-response)

**Analog:** `src/components/auth/InviteCodeForm.tsx` (full, lines 1-107) is the primary; `src/components/profile/ProfileNameEditor.tsx` (lines 1-92) shows the async-submit-with-toast variant. Reused for edit pre-filled (D-14).

**`'use client'` + RHF+Zod imports** (`InviteCodeForm` lines 1-28):
```typescript
'use client'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'                          // NOTE: Zod v4 installed (RESEARCH line 42) — write v4
import { Loader2 } from 'lucide-react'
import { es } from '@/i18n/es'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
```

**Zod schema + `mode: 'onBlur'`** (`InviteCodeForm` lines 33-51; `ProfileNameEditor` lines 26-31 for min/max-with-es-string):
```typescript
const schema = z.object({
  name: z.string().trim().min(1, es.trip.invalidName).max(80, es.trip.invalidName),
  // dates handled via TripDatePicker → refine end >= start with es.trip.invalidDateRange (RESEARCH line 304)
  // description: z.string().max(...).optional()
})
const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: {...}, mode: 'onBlur' })
```

**FormField + pending Button** (`InviteCodeForm` lines 62-104) — copy the `<Form>`/`<FormField>`/`<FormMessage>` skeleton and the `Loader2` spinner-while-pending submit verbatim:
```typescript
<Button type="submit" className="w-full" disabled={isPending}>
  {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : es.trip.saveCta}
</Button>
```

**Async-submit-with-toast variant** (for edit path, `ProfileNameEditor` lines 56-65):
```typescript
startTransition(async () => {
  const { error } = await updateTrip(...)
  if (error) toast.error(error); else toast.success(...)
})
```
The create path instead navigates (like `InviteCodeForm` lines 53-59, `router.push`/POST to the route handler).

---

### `src/components/trip/TripDatePicker.tsx` (NEW — NO ANALOG)

**No in-repo analog** — `Calendar`/`react-day-picker` is a brand-new primitive. Use **RESEARCH Pattern 3 verbatim** (lines 279-305). Key constraints: `mode="range"`, `numberOfMonths={1}`, **do NOT pass `required`** (it blocks the optional "Sin fechas" clear), `onSelect` receives `DateRange | undefined`. Install via `npx shadcn@latest add calendar` (RESEARCH line 64) — do not hand-copy a Radix tutorial (Pitfall 4: this repo is base-ui/base-nova, not Radix).

---

### `src/components/trip/DeleteTripDialog.tsx` (NEW — component, event-driven)

**Analog:** `src/components/ui/alert-dialog.tsx` (existing base-ui primitive) for the dialog shell + `ProfileNameEditor`'s controlled `Input` for the type-to-confirm gate. Pattern: an `AlertDialog` whose destructive confirm button stays `disabled` until typed value `=== trip.name` (trim-exact, case-sensitive — D-17 / UI-SPEC §6). Strings: `es.trip.deleteDialogHeading/Body/deleteConfirmLabel(name)`. On confirm → `deleteTrip` action → `router.refresh()`.

---

### `src/app/t/[tripId]/gente/page.tsx` (MOD — REPLACE placeholder; RSC, CRUD-read)

**Analog:** `src/app/t/[tripId]/layout.tsx` (lines 18-58) is the canonical RSC server-fetch-under-RLS pattern. The current `gente/page.tsx` (lines 1-16) is just an `EmptyState` to be replaced.

**RSC fetch pattern to copy** (`layout.tsx` lines 21-58):
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// member-gated SELECT: trip_members JOIN profiles (RLS hides non-member trips)
const { data: members } = await supabase
  .from('trip_members')
  .select('user_id, role, profiles(display_name, avatar_seed)')
  .eq('trip_id', tripId)
```
Mirror the nested-relation flatten at `layout.tsx:48-51`. Determine `isCreator` by comparing the row's `role === 'admin'` (or `trips.created_by === user.id`). Render `<InviteCard>` pinned at top (D-07), then `<MemberList>`. Page imports `es` like the placeholder did (line 6).

---

### `src/components/members/MemberRow.tsx` (NEW — component, event-driven)

**Analog:** `src/components/profile/UserAvatar.tsx` (lines 1-43) for the avatar+name composition. Row = `<UserAvatar userId={...} avatarSeed={...} displayName={...} size="md" />` + name (16px/400) + role badge(s) + right-aligned inline destructive action.

**UserAvatar usage** (from `layout.tsx:62-68` which already feeds it `avatarSeed`/`displayName`):
```typescript
<UserAvatar userId={m.user_id} avatarSeed={m.profiles?.avatar_seed} displayName={m.profiles?.display_name} size="md" />
```
Badges (`Creador`/`Tú`) and inline `Quitar`/`Salir` actions wire to `AlertDialog` → `removeMember`/`leaveTrip` (UI-SPEC §4). `MemberRow` is `'use client'` (it owns the dialog + action buttons); `MemberList` may stay an RSC mapping rows.

---

### `src/components/members/InviteCard.tsx` (NEW — component, clipboard event-driven)

**Analog:** `InviteCodeForm.tsx` (lines 1-2, 10-17) for the `'use client'` + sonner toast wiring; clipboard logic is NEW from **RESEARCH Pattern 6** (lines 344-356):
```typescript
'use client'
import { toast } from 'sonner'
import { es } from '@/i18n/es'
// on button click: await navigator.clipboard.writeText(es.invite.shareMessage(name, code, origin))
//   success → toast.success(es.invite.copiedToast); catch → toast.error(es.errors.genericNetwork)
```
Build `origin` from `window.location.origin` (client) or pass from the RSC. Payload carries BOTH `/join/[code]` deep-link AND bare code (D-09). Code value rendered at 20px/700 `text-accent tracking-wide` (UI-SPEC Typography). Coral full-width `Button` "Copiar invitación".

---

### `src/components/layout/TripSwitcherSheet.tsx` (MOD — wire the disabled button)

**Analog:** the same file (lines 63-72). Replace the `disabled` `<button>` with an enabled control that triggers the create flow (navigate to the route handler / open `CreateTripForm`). Keep `es.tripSwitcher.createCta` and the existing styling pattern (lines 50-61 show the trip-row style). D-05.

---

### `src/app/page.tsx` (MOD — two-choice welcome)

**Analog:** the same file (lines 37-66). Keep the `max-w-md px-4 min-h-dvh` shell (line 38) and the session-guard redirect (lines 22-35) UNCHANGED. Add the secondary "Quiero crear un viaje" affordance BELOW the existing sticky `<InviteCodeForm />` (line 63) — join stays visually primary (D-01 / UI-SPEC §1: outline/ghost secondary, "o" divider). New strings via `es.trip.createCta`/`joinCta`.

---

### `src/i18n/es.ts` (MOD — add `trip`/`members`/`invite` namespaces)

**Analog:** the same file (lines 7-80). Append three namespaces inside the `as const` object, following the existing typed-dictionary pattern. Function members are allowed (precedent: `auth.checkEmailBody` line 24-25, `anon.upgradeSuccessToast` line 70-71). RESEARCH lines 364-401 supplies the EXACT entry bodies (including `deleteConfirmLabel(name)`, `removeDialogHeading(name)`, `leaveDialogHeading(trip)`, `shareMessage(name, code, origin)`).

> Also EXTEND `src/i18n/es.test.ts` — it asserts namespace key presence (Plan 09 style, lines 7-45). Add `describe` blocks for `trip`/`members`/`invite` keys to prevent accidental renames.

---

### `src/components/ui/calendar.tsx` + `src/components/ui/textarea.tsx` (NEW — CLI primitives, NO ANALOG)

`calendar` and `textarea` are NOT in `src/components/ui/` (verified). Generate via `npx shadcn@latest add calendar` and `npx shadcn@latest add textarea` so they resolve the repo's `base-nova` variant (Pitfall 4 — NEVER hand-copy a Radix tutorial). `textarea`'s closest in-repo shape is `input.tsx`. Do not author these by hand.

---

## Shared Patterns

### Service-role bounded mutation (CREATE path ONLY)
**Source:** `src/actions/members.ts` lines 86-102.
**Apply to:** `src/actions/trips.ts` `createTrip` only (the `trips` INSERT + creator `trip_members` admin INSERT). Edit/remove/leave/delete run under normal RLS — NOT service-role.
```typescript
const admin = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
```

### Identity always from server session
**Source:** `src/actions/members.ts` lines 43-69.
**Apply to:** every action in `trips.ts` + `members.ts`. `userId` from `getUser()`/`signInAnonymously()`, never client input. Do not short-circuit on a `getUser()` error (comment at lines 48-53).

### Refetch freshness (NO realtime in Phase 2)
**Source:** RESEARCH Open Q1 (line 497) — resolved.
**Apply to:** every mutating action's caller. `revalidatePath('/t/[tripId]/...')` + `router.refresh()` after the mutation. Removed/left member is bounced on next nav via the `layout.tsx` null-trip guard (lines 37-39, D-13) — no realtime, no "ya no eres parte" screen.

### RSC fetch under RLS
**Source:** `src/app/t/[tripId]/layout.tsx` lines 21-58.
**Apply to:** `gente/page.tsx` member-list read. `await createClient()` → `getUser()` → `.from(...).select(...).eq('trip_id', tripId)`; RLS gates visibility; flatten nested relations (lines 48-51).

### RHF + Zod (v4) form
**Source:** `src/components/auth/InviteCodeForm.tsx` (full) + `ProfileNameEditor.tsx`.
**Apply to:** `CreateTripForm`, `DeleteTripDialog` input. `zodResolver`, `mode: 'onBlur'`, `<Form>/<FormField>/<FormMessage>`, `Loader2` pending button. **Write Zod v4** (installed `^4.4.3`, RESEARCH line 42 — CLAUDE.md's "v3" note is stale).

### All strings via `es.ts`; destructive confirms via `AlertDialog`
**Source:** project rule (CLAUDE.md / Phase 1 verify) + `src/components/ui/alert-dialog.tsx`.
**Apply to:** every new component. Zero hardcoded Spanish in JSX; remove/leave/delete all use the existing base-ui `AlertDialog`.

### es-MX date display (single source of truth)
**Source:** NEW `src/lib/utils/date-format.ts` (RESEARCH Patterns 4-5).
**Apply to:** trip header, switcher list, member/trip cards (D-18). Local-parse always; never `.toISOString()`/`new Date(str)` (Pitfall 2).

---

## No Analog Found

| File | Role | Data Flow | Reason | Use Instead |
|------|------|-----------|--------|-------------|
| `src/components/trip/TripDatePicker.tsx` | component | event-driven | `react-day-picker`/`Calendar` is a brand-new dependency; no calendar exists in the repo | RESEARCH Pattern 3 (lines 279-305) + `npx shadcn add calendar` |
| `src/components/ui/calendar.tsx` | UI primitive | — | Not yet installed (verified `ls src/components/ui/`) | `npx shadcn@latest add calendar` (base-nova) |

> `src/components/ui/textarea.tsx` has a partial analog (`input.tsx`) but should still be CLI-generated for base-nova consistency, not hand-written.

---

## Metadata

**Analog search scope:** `src/actions/`, `src/lib/utils/`, `src/components/{auth,profile,layout,ui,common}/`, `src/app/`, `src/i18n/`, `src/types/`.
**Files scanned:** 14 read in full + `ls src/components/ui/` + `database.ts` (trips type) + `es.test.ts` (head).
**Pattern extraction date:** 2026-06-05
**Schema:** No new migration required (RESEARCH lines 437) — `invite_code` column/UNIQUE/resolver/RLS all shipped in `20260530000006_invite_code.sql`; `database.ts` already current.
