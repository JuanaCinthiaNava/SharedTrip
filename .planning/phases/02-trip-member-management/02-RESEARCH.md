# Phase 2: Trip + Member Management - Research

**Researched:** 2026-06-05
**Domain:** Next.js 16 Server Actions + Supabase RLS/anonymous-auth + shadcn (base-ui) UI for CRUD on a trip container and its membership
**Confidence:** HIGH

## Summary

Phase 2 is **not greenfield** — it extends a working Phase 1 codebase whose patterns are already proven on-device (11/11 UAT). Every hard problem in this phase has a verbatim precedent already in the repo:

- The **post-`signInAnonymously()` insert problem** for trip creation is the *exact* problem `joinTripByCode` already solved with the **service-role bounded-mutation** pattern (`src/actions/members.ts`). The recommendation is to **reuse that pattern, not introduce a DB trigger** — it keeps creator-as-admin insertion in one auditable place, avoids a new SECURITY DEFINER surface, and the trigger alternative does not actually avoid the service-role client for the `trips` INSERT itself.
- **`invite_code` generation** is pure application logic (a prefix-from-name + unambiguous-suffix string) run server-side inside the create Server Action / route handler, with a retry loop against the existing `trips_invite_code_key` UNIQUE constraint. No new migration is required for generation; the column, constraint, and resolver already shipped in `20260530000006_invite_code.sql`.
- All **RLS for TRIP-06/07/08/09 already exists and authorizes this phase** — the work is the UI + action layer (the `trips` UPDATE/DELETE policies are creator-only; the `trip_members` DELETE policy already authorizes admin-removes-member and member-leaves).
- The **date picker** is the only genuinely new dependency: `react-day-picker` (v10.0.1, framework-agnostic, no Radix/base-ui coupling) via `npx shadcn add calendar`. Because dates are **optional** (D-03), do **not** pass the `required` prop and supply an explicit "Sin fechas" clear control.
- For **"instantly for all members"** (Success Criterion 4): **`router.refresh()` after the mutating Server Action is sufficient for Phase 2.** Supabase Realtime is deferred to Phase 4 (ITIN-04). The criterion is about the *editor* seeing their change reflected and other members seeing it on next view — not live multi-client push. Realtime adds a client subscription + connection-budget cost that is not justified for a low-frequency edit on a <10-person trip.

**Primary recommendation:** Build vertical slices that mirror `joinTripByCode` + the `/join/[code]` route handler exactly. Trip creation = a **route handler** (it must write the anon-session cookie) that calls a `createTrip` Server Action using the **service-role client** for both the `trips` INSERT and the self `trip_members` admin INSERT, with `created_by`/`user_id` taken from the server session — never client input. Mutations (edit/remove/leave/delete) are plain Server Actions guarded by existing RLS, followed by `revalidatePath`/`router.refresh()`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Trip creation (anon session + insert) | API / Server (route handler + Server Action, service-role) | Browser (form) | Must write session cookie (route handler) + bypass in-request RLS chicken-and-egg (service-role); identity from server session only |
| `invite_code` generation | API / Server (action) | Database (UNIQUE constraint enforces collision) | Pure string logic + retry against existing constraint; no client trust |
| Trip edit (name/dates/desc) | API / Server (Server Action) | Database (creator-only UPDATE RLS) | RLS already authorizes; identity from `auth.uid()` |
| Member remove / leave | API / Server (Server Action) | Database (`trip_members` DELETE RLS) | RLS already authorizes admin-remove + self-leave |
| Trip delete (cascade) | API / Server (Server Action) | Database (creator-only DELETE RLS + `ON DELETE CASCADE`) | RLS authorizes; cascade wipes children |
| Member list / trip list read | Frontend Server (RSC fetch) | Database (member-gated SELECT RLS) | Server Components already do this in `t/[tripId]/layout.tsx` |
| Invite-code display + copy | Browser (client component) | — | `navigator.clipboard.writeText` is a browser API |
| Date formatting (`es-MX`) | Shared util (runs server or client) | — | Pure `Intl` call; one helper module |
| Freshness after edit | Frontend Server (`revalidatePath`) + Browser (`router.refresh()`) | — | Refetch model; Realtime deferred to Phase 4 |

## Standard Stack

### Core (already installed — verified in package.json)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | Route handlers + Server Actions + RSC | Phase 1 baseline; Server Actions are the mutation boundary [VERIFIED: package.json] |
| @supabase/ssr | ^0.10.3 | Cookie-aware server client | Phase 1 auth boundary [VERIFIED: package.json] |
| @supabase/supabase-js | ^2.106.2 | Service-role client for bounded mutations | Used verbatim in `joinTripByCode` [VERIFIED: package.json] |
| react-hook-form | ^7.76.1 | Create/edit form | Phase 1 form stack (`InviteCodeForm`) [VERIFIED: package.json] |
| zod | ^4.4.3 | Form schema validation | NOTE: project is on **Zod v4**, not v3 as CLAUDE.md states [VERIFIED: package.json] |
| @hookform/resolvers | ^5.4.0 | RHF ↔ Zod bridge | `zodResolver` already used [VERIFIED: package.json] |
| sonner | ^2.0.7 | "Copiado" / success toasts | Already wired (`src/components/ui/sonner.tsx`) [VERIFIED: package.json] |
| lucide-react | ^1.17.0 | Icons | Phase 1 icon lib [VERIFIED: package.json] |

### Supporting (NEW — to install this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | 10.0.1 (latest) | Range date picker behind shadcn `Calendar` | D-04 optional start/end date entry; pulled automatically by `npx shadcn add calendar` |
| date-fns | ^4.x | Peer/helper of react-day-picker v10 | Installed transitively by react-day-picker; you do **not** need to author date-fns code — use `Intl` for display |

> **Do NOT add a separate date-formatting library.** `Intl.DateTimeFormat('es-MX')` is built into the runtime and is the locked decision (D-18, UI-05). date-fns arrives only as a react-day-picker dependency.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Service-role insert for creator-as-admin | `SECURITY DEFINER` trigger on `trips` INSERT | Trigger does NOT remove the need for the service-role `trips` INSERT itself (the chicken-and-egg is on the `trips` row, not just `trip_members`). Adds a second hidden write path + new SECURITY DEFINER surface. **Not recommended** — see Pitfall 1. |
| `npx shadcn add calendar` | Hand-rolled `<DayPicker>` import | shadcn wraps DayPicker with the project's base-nova theme tokens + lucide chevrons; hand-rolling re-does that styling. Use the CLI. |
| `router.refresh()` refetch | Supabase Realtime `postgres_changes` | Realtime is a Phase 4 (ITIN-04) capability; adds a client subscription + 200-connection free-tier budget draw for a low-frequency edit. **Refetch recommended for Phase 2.** |

**Installation:**
```bash
npx shadcn@latest add calendar
# (this adds src/components/ui/calendar.tsx and installs react-day-picker + date-fns)
```

**Version verification (this session):**
- `react-day-picker` latest = **10.0.1**, created 2014, maintained by `gpbl`, **~39.1M downloads/week**, repo `github.com/gpbl/react-day-picker` [VERIFIED: npm registry]. peerDeps: `react >=16.8.0` — compatible with React 19.2.4. v10 depends on `date-fns ^4.1.0` + `@date-fns/tz ^1.4.1`.
- The v9/v10 line is the post-rewrite API (`mode="range"`, `DateRange { from, to }`, `selected`/`onSelect`). The legacy v7/v8 API differs — ignore v7/v8 examples [CITED: daypicker.dev/selections/range-mode].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| react-day-picker | npm | ~11 yrs (since 2014) | ~39.1M/wk | github.com/gpbl/react-day-picker | unavailable | Approved (overwhelming legitimacy signals) |
| date-fns | npm | mature | (transitive) | github.com/date-fns/date-fns | unavailable | Approved (rdp transitive dep) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

> slopcheck could not be installed in this session. Per protocol both packages would normally be tagged `[ASSUMED]` and gated behind a checkpoint. **However**, `react-day-picker` is the canonical dependency the official shadcn `Calendar` component pulls in — it is discovered from an authoritative source (shadcn docs) AND has 11-year history + 39M weekly downloads + a real source repo. The planner may treat the install as low-risk but **should still install via `npx shadcn add calendar`** (which resolves the exact version shadcn expects) rather than a bare `npm install react-day-picker@<guessed-version>`.

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────────┐
   CREATE FLOW          │  Welcome screen "/"  (two-choice — D-01)      │
   (needs cookie write) │  [Ya me invitaron]        [Quiero crear]      │
                        └───────┬───────────────────────┬──────────────┘
                                │                        │
                  existing InviteCodeForm        CreateTripForm (client, RHF+Zod)
                                │                        │ submit
                                ▼                        ▼
                     GET /join/[code]          POST → route handler /trips/new (or action)
                     (writes anon cookie)       (writes anon cookie if no session)
                                │                        │ calls
                                │                        ▼
                                │              createTrip() Server Action
                                │              1. getUser() → userId (or signInAnonymously)
                                │              2. generate invite_code (retry on UNIQUE)
                                │              3. SERVICE-ROLE client:
                                │                 INSERT trips (created_by = userId)
                                │                 INSERT trip_members (userId, role='admin')
                                │                        │ returns tripId
                                ▼                        ▼
                        redirect → /t/[tripId]/docs  (or /t/[tripId]/gente)

   ───────────────────────────────────────────────────────────────────────────

   READ / MUTATE FLOW  (inside an existing session — plain Server Actions, RLS-guarded)

   /t/[tripId]/gente (RSC)  ──fetch──▶ trip_members JOIN profiles (member-gated SELECT RLS)
        │                                       │
        │ renders MemberRow[] + Invite card     ▼
        │                              UserAvatar + role badge (Creador / Tú)
        │
        ├─ "Quitar {nombre}"  ─▶ AlertDialog ─▶ removeMember(tripId,userId) action
        │                                         DELETE trip_members  (admin-or-self RLS)
        ├─ "Salir del viaje"   ─▶ AlertDialog ─▶ leaveTrip(tripId) action
        │                                         DELETE trip_members  (self RLS)
        ├─ "Editar viaje"      ─▶ reuse CreateTripForm pre-filled ─▶ updateTrip() action
        │                                         UPDATE trips  (creator-only RLS)
        └─ "Eliminar viaje"    ─▶ AlertDialog (type-name-to-confirm) ─▶ deleteTrip() action
                                                  DELETE trips  (creator-only RLS) → CASCADE

   After any mutation: revalidatePath(/t/[tripId]/...) + router.refresh()  (NO realtime in P2)
   Removed/left member: next navigation → layout.tsx null-trip guard → redirect("/")  (D-13)
```

### Recommended Project Structure
```
src/
├── actions/
│   ├── members.ts          # EXISTS — joinTripByCode; ADD removeMember, leaveTrip
│   └── trips.ts            # NEW — createTrip, updateTrip, deleteTrip (service-role for create)
├── app/
│   ├── page.tsx            # EDIT — split welcome into two-choice (D-01)
│   └── t/[tripId]/
│       ├── gente/page.tsx  # REPLACE placeholder — member list + invite card (D-07)
│       └── (edit surface)  # planner's call: header button, settings sheet, or /editar
├── components/
│   ├── trip/
│   │   ├── CreateTripForm.tsx   # NEW — RHF+Zod; reused for edit (D-14)
│   │   ├── TripDatePicker.tsx   # NEW — wraps shadcn Calendar in range mode + clear (D-04)
│   │   └── DeleteTripDialog.tsx # NEW — type-name-to-confirm (D-17)
│   ├── members/
│   │   ├── MemberList.tsx       # NEW
│   │   ├── MemberRow.tsx        # NEW — UserAvatar + name + role badge + action (D-10/D-12)
│   │   └── InviteCard.tsx       # NEW — code display + Copiar invitación (D-07/D-08/D-09)
│   └── ui/calendar.tsx          # NEW — added by `npx shadcn add calendar`
├── lib/utils/
│   ├── invite-code.ts      # EXISTS — CODE_RE; ADD generateInviteCode(name)
│   └── date-format.ts      # NEW — formatTripDate / formatTripRange (es-MX, D-18)
└── i18n/es.ts              # EDIT — add trip / members / invite namespaces
```

### Pattern 1: Service-role bounded mutation for trip creation (REUSE)
**What:** After `signInAnonymously()` (or with an existing session), do the privileged inserts with the service-role client, taking identity from the *server* session.
**When to use:** The trip-create path only. Edit/remove/leave/delete run under normal RLS — they do NOT need service-role.
**Why:** Identical in-request session-propagation constraint as `joinTripByCode`. The freshly-minted anon session lives only on the response cookie; an RLS `WITH CHECK (created_by = auth.uid())` would see `auth.uid() = null` on the same request and fail.

```typescript
// src/actions/trips.ts  (NEW) — mirrors src/actions/members.ts:86-104
'use server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils/invite-code'
import { es } from '@/i18n/es'
import type { Database } from '@/types/database'

interface CreateTripInput {
  name: string
  startDate: string | null   // 'YYYY-MM-DD' (local), null if no dates
  endDate: string | null
  description: string | null
}

export async function createTrip(
  input: CreateTripInput
): Promise<{ tripId: string | null; error: string | null }> {
  const supabase = await createClient()

  // identity from server session — never from client input
  const { data: { user: existing } } = await supabase.auth.getUser()
  let userId = existing?.id
  if (!existing) {
    const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously()
    if (anonErr || !anon.user) return { tripId: null, error: es.errors.genericNetwork }
    userId = anon.user.id
  }
  if (!userId) return { tripId: null, error: es.errors.genericNetwork }

  const admin = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,                    // server-only (note the var name in Phase 1)
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // collision-retry loop against trips_invite_code_key UNIQUE (see Pattern 2)
  let tripId: string | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite_code = generateInviteCode(input.name)
    const { data, error } = await admin
      .from('trips')
      .insert({
        name: input.name,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
        created_by: userId,
        invite_code,
      })
      .select('id')
      .single()
    if (!error && data) { tripId = data.id; break }
    // 23505 = unique_violation → regenerate suffix and retry
    if (error && (error as { code?: string }).code !== '23505') {
      return { tripId: null, error: es.errors.genericNetwork }
    }
  }
  if (!tripId) return { tripId: null, error: es.errors.genericNetwork }

  // creator joins as admin (same service-role rationale as joinTripByCode)
  const { error: memberErr } = await admin
    .from('trip_members')
    .upsert(
      { trip_id: tripId, user_id: userId, role: 'admin' },
      { onConflict: 'trip_id,user_id', ignoreDuplicates: true }
    )
  if (memberErr) return { tripId: null, error: es.errors.genericNetwork }

  return { tripId, error: null }
}
```

> **`SUPABASE_SECRET_KEY` var name:** `joinTripByCode` reads `process.env.SUPABASE_SECRET_KEY` — reuse that exact var, do not invent `SUPABASE_SERVICE_ROLE_KEY`. [VERIFIED: src/actions/members.ts:88]

### Pattern 2: invite_code generation (NEW — add to invite-code.ts)
**What:** Pure function `generateInviteCode(name)` producing a `CODE_RE`-valid string; the caller retries on UNIQUE violation.
**When to use:** Inside `createTrip` only.

```typescript
// src/lib/utils/invite-code.ts  (ADD)
// Unambiguous alphabet: excludes 0/O, 1/I/L per D-06.
const SUFFIX_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'  // no O,I,L,0,1

export function generateInviteCode(name: string): string {
  // PREFIX: first ~4 letters of name, uppercased, non-alpha stripped.
  // CODE_RE requires prefix 2–8 chars; pad if the name yields < 2 alpha chars.
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '')
  let prefix = letters.slice(0, 4)
  if (prefix.length < 2) {
    // fallback: pad from the suffix alphabet so CODE_RE always matches
    prefix = (prefix + 'AA').slice(0, 2)
  }
  // SUFFIX: 4 random chars from the unambiguous alphabet (CODE_RE allows 3–6).
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)]
  }
  return `${prefix}-${suffix}`   // e.g. "MARR-4F9K", "CANC-7HXY"
}
```

> Notes for the planner:
> - **Where it runs:** in the Server Action (Pattern 1), **not** a DB default or trigger — the prefix depends on the trip name and the retry must observe the UNIQUE error. A DB default cannot derive the prefix cleanly at INSERT time.
> - **`Math.random()` is fine here** — this is a *display* invite code (possession = capability, same threat model as the resolver doc), not a secret token. The vestigial `invite_token` uuid remains for any cryptographic need. If the planner prefers, `crypto.getRandomValues` is a drop-in; not required.
> - **Always validate** the generated code against `CODE_RE` in a unit test (Wave 0) — the suffix-padding branch is the one that can regress.
> - Output is uppercase, so it round-trips through `normalizeInviteCode` (`upper(trim())`) and the DB resolver unchanged.

### Pattern 3: shadcn Calendar in range mode, OPTIONAL (D-04)
**What:** Range picker that can be fully cleared (dates are optional per D-03).
**When to use:** Inside `CreateTripForm` (and the reused edit form).

```typescript
// src/components/trip/TripDatePicker.tsx  (NEW)
'use client'
import { Calendar } from '@/components/ui/calendar'
import type { DateRange } from 'react-day-picker'

interface Props { value?: DateRange; onChange: (r: DateRange | undefined) => void }

export function TripDatePicker({ value, onChange }: Props) {
  return (
    <Calendar
      mode="range"
      // DO NOT pass `required` — `required` makes the range un-clearable.
      // Dates are optional (D-03); a separate "Sin fechas" button calls onChange(undefined).
      selected={value}
      onSelect={onChange}
      numberOfMonths={1}     // mobile-first (UI-03); 320px viewport
    />
  )
}
```

Key API facts [CITED: daypicker.dev/selections/range-mode]:
- `mode="range"` → `selected` is `DateRange | undefined` where `DateRange = { from?: Date; to?: Date }`.
- `onSelect(range, triggerDate)` — first arg is the new `DateRange | undefined`.
- **`required` prevents un-selecting** — omit it so "Sin fechas" works.
- Validate `end >= start` in the Zod schema before submit (D-04). When only `from` is set (single-tap), treat as start-only or force the user to pick `to`; planner decides UX, but the action must accept `startDate` set with `endDate` null.
- The shadcn `Calendar` imports react-day-picker CSS/theme internally; you do **not** add a manual `react-day-picker/style.css` import.

### Pattern 4: Date serialization across the tier boundary (CRITICAL — see Pitfall 2)
```typescript
// Picker gives Date objects (local midnight). DB `date` columns want 'YYYY-MM-DD'.
// NEVER use .toISOString() — it converts to UTC and shifts the day in UTC-6 (es-MX).
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Reading back: parse 'YYYY-MM-DD' as LOCAL, not via new Date(str) (which is UTC).
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
```

### Pattern 5: es-MX date display helper (D-18, UI-05)
```typescript
// src/lib/utils/date-format.ts  (NEW) — single source of truth for all later phases.
const FMT = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatTripRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end)  return FMT.formatRange(parseLocalDate(start), parseLocalDate(end))
  const one = (start ?? end)!
  return FMT.format(parseLocalDate(one))
}
```
Verified output (es-MX, local-parsed) [VERIFIED: node Intl runtime, this session]:
- Single: `5 jun 2026`
- Same-month range: `5–12 de jun de 2026`
- Cross-month: `28 de jun – 3 de jul 2026`
- Cross-year: `30 de dic de 2026 – 2 de ene de 2027`
- Both null → `null` (caller hides the date row — D-03)

> `formatRange` injects "de" connectors; if the design wants the terse "5 jun – 12 jun 2026" from CONTEXT D-18, format each endpoint separately and join with " – ". Planner picks; either is es-MX-correct. Lock ONE in the helper so every phase inherits it.

### Pattern 6: Clipboard copy (D-08/D-09)
```typescript
// inside InviteCard.tsx ('use client')
import { toast } from 'sonner'
import { es } from '@/i18n/es'

async function copyInvite(name: string, code: string, origin: string) {
  const msg = es.invite.shareMessage(name, code, origin)  // see es.ts pattern below
  try {
    await navigator.clipboard.writeText(msg)
    toast.success(es.invite.copiedToast)
  } catch {
    toast.error(es.errors.genericNetwork)  // clipboard blocked / insecure context
  }
}
```
- `navigator.clipboard.writeText` requires a **secure context (HTTPS)** and a **user gesture** (the button click satisfies this) [CITED: MDN clipboard/writeText]. Production is HTTPS on Vercel; `vercel dev --experimental-https` for local SW/clipboard testing (Phase 1 note).
- Build the URL from `window.location.origin` on the client, or pass the request origin from the RSC. The message MUST contain both the `/join/[code]` deep-link AND the bare code (D-09) — both Phase 1 entry paths.

### es.ts namespace additions (follow the `as const` typed-dictionary pattern)
```typescript
// add to src/i18n/es.ts — function members are allowed (see auth.checkEmailBody / anon.*)
trip: {
  createCta: 'Crear viaje',
  joinCta: 'Ya me invitaron',
  nameLabel: 'Nombre del viaje',
  namePlaceholder: 'Cancún 2026',
  datesLabel: 'Fechas (opcional)',
  noDates: 'Sin fechas todavía',
  descriptionLabel: 'Descripción (opcional)',
  saveCta: 'Guardar',
  editCta: 'Editar viaje',
  deleteCta: 'Eliminar viaje',
  deleteDialogHeading: '¿Eliminar este viaje?',
  deleteDialogBody: 'Esto borra el viaje y todo su contenido para todos. No se puede deshacer.',
  deleteConfirmLabel: (name: string) => `Escribe "${name}" para confirmar`,
  invalidName: 'El nombre debe tener entre 1 y 80 caracteres.',
  invalidDateRange: 'La fecha de fin debe ser igual o posterior a la de inicio.',
},
members: {
  heading: 'Miembros del viaje',
  badgeCreator: 'Creador',
  badgeYou: 'Tú',
  removeCta: 'Quitar',
  removeDialogHeading: (name: string) => `¿Quitar a ${name} del viaje?`,
  removeDialogConfirm: 'Sí, quitar',
  leaveCta: 'Salir del viaje',
  leaveDialogHeading: (trip: string) => `¿Salir de ${trip}?`,
  leaveDialogConfirm: 'Sí, salir',
  cancel: 'Cancelar',
},
invite: {
  cardHeading: 'Invita a tu grupo',
  cardBody: 'Comparte este código o el enlace para que se unan.',
  copyCta: 'Copiar invitación',
  copiedToast: 'Copiado',
  shareMessage: (name: string, code: string, origin: string) =>
    `Únete a mi viaje "${name}" en SharedTrip 🌴  ${origin}/join/${code}  (o escribe el código ${code})`,
},
```

### Anti-Patterns to Avoid
- **Trusting client-supplied `created_by`/`user_id`.** Always from the server session (Phase 1 established pattern).
- **`.toISOString()` to serialize a picked date** → off-by-one day in es-MX (UTC-6). Use `toLocalDateString` (Pitfall 2).
- **`new Date('2026-06-05')` to parse a `date` column** → parses as UTC midnight, displays as June 4. Use `parseLocalDate` (Pitfall 2).
- **Passing `required` to the range Calendar** → users can't choose "sin fechas" (D-03/D-04).
- **Adding a DB trigger AND keeping the service-role insert** → two write paths for membership (Pitfall 1).
- **Reaching for Realtime in Phase 2** → out of scope; `router.refresh()` suffices (Open Question resolved below).
- **Hardcoding Spanish in JSX** → every string via `es.ts` (project rule, enforced in Phase 1 verify).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Range date picker | Custom calendar grid | `npx shadcn add calendar` (react-day-picker) | Keyboard nav, range painting, month nav, a11y are all solved |
| es-MX date strings | Manual month-name arrays | `Intl.DateTimeFormat('es-MX')` + `formatRange` | Built-in, locale-correct, handles cross-month/year connectors |
| Anon-session + privileged insert | New auth dance | Reuse `joinTripByCode` service-role pattern verbatim | Already device-verified; the in-request cookie constraint is subtle |
| Member-list authorization | New RLS policies | Existing `trips`/`trip_members` policies | Already shipped and authorize TRIP-05..09 |
| Destructive confirms | Custom modal | Existing `alert-dialog` (base-ui) | Already in `src/components/ui/` |
| Copy to clipboard | execCommand fallback hacks | `navigator.clipboard.writeText` | Standard, secure-context API; prod is HTTPS |

**Key insight:** This phase's risk is almost entirely in *correctly reusing* Phase 1 patterns (session propagation, RLS, es.ts, base-ui components), not in new technology. The single new dependency (react-day-picker) is mature and shadcn-wrapped.

## Runtime State Inventory

This is a feature-addition phase, not a rename/refactor. No string-replacement or migration of existing runtime state is involved.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — new rows only (trips/trip_members created going forward). The Phase 1 seed trip `TEST-AB12` keeps its existing `invite_code`. | None |
| Live service config | None — no external service config embeds trip identifiers | None |
| OS-registered state | None | None |
| Secrets/env vars | Reuse existing `SUPABASE_SECRET_KEY` + `NEXT_PUBLIC_SUPABASE_URL` (already set, used by `joinTripByCode`). No new secrets. | None |
| Build artifacts | `src/types/database.ts` is already current (`invite_code` present). Regenerate only if a NEW migration is added — **none is required** for this phase. | None unless a migration is added |

**Schema change needed?** **No new migration is required.** Column (`invite_code`), UNIQUE constraint, resolver, and all RLS policies already exist. If the planner chooses the (not-recommended) trigger approach, that WOULD add a migration + a `database.ts` regen.

## Common Pitfalls

### Pitfall 1: Trigger vs service-role for creator-as-admin — the trigger does not save you
**What goes wrong:** Planner adds a `SECURITY DEFINER` trigger on `trips` INSERT to auto-insert the creator into `trip_members`, assuming it removes the service-role need.
**Why it happens:** The trigger does cleanly handle the *membership* row. But the **`trips` INSERT itself** still hits the same in-request session problem — the `trips` INSERT policy is `WITH CHECK (created_by = (SELECT auth.uid()))`, and right after `signInAnonymously()` `auth.uid()` is null on that request, so the `trips` insert fails *before* the trigger ever fires. You still need the service-role client for the `trips` INSERT. Adding the trigger then gives you **two** membership-write paths (trigger + the join action) and a new SECURITY DEFINER surface to audit.
**How to avoid:** Do both inserts in the service-role action (Pattern 1). One write path, identity from server session, mirrors the verified `joinTripByCode`. If a trigger is ever added later, it MUST be `SECURITY DEFINER SET search_path = public` (established pattern) — but it is not recommended for Phase 2.
**Warning signs:** A new migration appears in this phase; `created_by` insert fails with RLS error in the create flow.

### Pitfall 2: Date off-by-one in es-MX (UTC-6)
**What goes wrong:** A trip created with start `2026-06-05` displays as "4 jun" and round-trips back as the wrong day.
**Why it happens:** `new Date('2026-06-05')` is parsed as **UTC midnight**; rendered in es-MX (UTC-6) it's the prior evening → June 4. Symmetrically, `pickedDate.toISOString().slice(0,10)` shifts forward.
**How to avoid:** Use `parseLocalDate` (split the string, construct local) for reading and `toLocalDateString` (build from local getters) for writing (Pattern 4). Verified in this session: naive path produced June 4, local path preserved June 5.
**Warning signs:** Dates render one day earlier than entered; the date "jumps" after save.

### Pitfall 3: `invite_code` collision retry must catch the right error code
**What goes wrong:** The retry loop treats every insert error as retryable, masking real failures; or it never retries because it checks the wrong field.
**Why it happens:** PostgREST surfaces the Postgres `unique_violation` as `error.code === '23505'`. Other errors (FK, check constraint) must bubble up, not loop.
**How to avoid:** Only regenerate-and-retry on `code === '23505'`; return `genericNetwork` on any other error; cap retries (5) and fail closed (Pattern 1).
**Warning signs:** Silent infinite-ish retries; or duplicate-code error reaching the user despite the loop.

### Pitfall 4: base-ui, not Radix — shadcn add must use this project's style
**What goes wrong:** Copy-pasting a Calendar example that imports Radix primitives or assumes the default shadcn registry breaks against this repo.
**Why it happens:** `components.json` sets `"style": "base-nova"` — primitives come from `@base-ui/react`, not `@radix-ui/*` (see `alert-dialog.tsx`, `button.tsx`). `react-day-picker` itself is framework-agnostic (no Radix/base-ui dependency), so the Calendar wrapper is fine, but any *other* component you add must come through `npx shadcn add` so it resolves the base-nova variant.
**How to avoid:** Always add components via `npx shadcn@latest add <name>` (respects `components.json`); never hand-copy from a Radix-style tutorial.
**Warning signs:** Imports of `@radix-ui/*`; `buttonVariants` shape mismatch; type errors on `*.Props`.

### Pitfall 5: Removed/left member needs a navigation to be bounced (D-13)
**What goes wrong:** A removed member stays on the screen until they navigate; the remover expects them gone instantly.
**Why it happens:** The bounce relies on the `t/[tripId]/layout.tsx` null-trip guard, which only runs on the *removed user's* next request. RLS already hides the trip; there is no server push (no Realtime in P2).
**How to avoid:** This is acceptable for v1 (D-13 explicitly). The *remover* sees the list update via `router.refresh()`. Do not build a "ya no eres parte" screen (deferred).
**Warning signs:** Expectation creep toward live eviction — that's Realtime (Phase 4), out of scope.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-day-picker v7/v8 API (`onDayClick`, `selectedDays`) | v9/v10 `mode`/`selected`/`onSelect` + `DateRange` | v9 (rewrite) | Ignore pre-v9 tutorials; use the typed `DateRange` API |
| Radix-based shadcn | base-ui (`base-nova` style) | this project's setup | All primitives are `@base-ui/react`; add via CLI |
| Zod v3 (CLAUDE.md) | **Zod v4** (`^4.4.3` installed) | project install | Use v4 syntax; CLAUDE.md's "zod ^3.x" note is stale (see Assumptions) |

**Deprecated/outdated:**
- CLAUDE.md "React Hook Form + Zod (zod ^3.x)" — installed is **Zod v4.4.3**. v4 is API-compatible for the simple `z.object/z.string/z.regex` used here; no blocker, but write v4.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Math.random()` is acceptable for invite_code suffix (display code, not a secret) | Pattern 2 | LOW — possession-equals-capability matches the resolver's documented threat model; swap to `crypto.getRandomValues` if the planner disagrees |
| A2 | `router.refresh()` / `revalidatePath` satisfies Success Criterion 4 "instantly for all members" without Realtime | Summary / Open Questions | MEDIUM — if the user reads "instantly" as live multi-client push, Realtime moves earlier; CONTEXT explicitly leans refetch-is-fine |
| A3 | `npx shadcn add calendar` resolves a base-nova-compatible Calendar | Stack / Pitfall 4 | LOW — react-day-picker is framework-agnostic; verify the generated file imports cleanly after add |
| A4 | `formatRange` "de"-connector output is acceptable es-MX vs the terser D-18 example | Pattern 5 | LOW — both are locale-valid; planner locks one helper |
| A5 | No new migration needed (column/constraint/RLS all exist) | Runtime State Inventory | LOW — verified by reading `20260530000001` + `20260530000006`; only the trigger alternative would add one |

## Open Questions

1. **"Instantly for all members" (Success Criterion 4) — Realtime in Phase 2?**
   - What we know: Realtime is formally a Phase 4 (ITIN-04) capability; CONTEXT leans "refetch is fine if Realtime adds material complexity"; the edit is low-frequency on a <10-person trip.
   - What's unclear: whether the user interprets "instantly" as live push to *other* connected members vs. fresh-on-next-view.
   - **Recommendation: `revalidatePath` + `router.refresh()` for Phase 2.** Defer Realtime to Phase 4. The editor sees their change immediately; other members see it on next navigation/focus. This avoids a Realtime subscription + the 200-connection free-tier budget for marginal benefit. Flag for the planner to confirm with the user if "instantly" is contractual.

2. **Creator-as-admin mechanism — service-role action vs DB trigger.**
   - What we know: both are technically valid; trigger must be `SECURITY DEFINER SET search_path = public`.
   - **Recommendation: service-role action (Pattern 1).** The trigger does not eliminate the service-role need for the `trips` INSERT itself (Pitfall 1), and it adds a second membership-write path. One auditable path, mirrors verified `joinTripByCode`.

3. **Edit surface placement (D-14).** CONTEXT defers exact placement to the planner (trip header button vs settings sheet vs `/editar` route). Not a research question — flagged so the planner decides. Recommendation: a "Editar" affordance in the trip header or top of Gente, reusing `CreateTripForm` pre-filled.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node/npm + Next 16 | All | ✓ | next 16.2.6 | — |
| Supabase (live) | All DB ops | ✓ | hosted; seed trip TEST-AB12 applied | — |
| `SUPABASE_SECRET_KEY` env | Service-role create | ✓ (used by joinTripByCode) | — | none needed; already set |
| react-day-picker | D-04 date picker | ✗ (not yet installed) | install 10.0.1 | none needed — `npx shadcn add calendar` installs it |
| HTTPS (clipboard secure context) | D-08 copy | ✓ prod (Vercel) | — | `vercel dev --experimental-https` locally |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** react-day-picker — installed via the shadcn add step (not blocking).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.7 (`environment: 'node'`) [VERIFIED: vitest.config.ts] |
| Config file | `vitest.config.ts` (`@` alias → `./src`) |
| Quick run command | `npx vitest run src/lib/utils/invite-code.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

Existing tests: `src/lib/utils/invite-code.test.ts`, `avatar.test.ts`, `es.test.ts` (all pure-function unit tests; node env, no DOM). The current suite is **pure-logic only** — there is no component/integration harness, and Server Actions hit a live Supabase, so they are not unit-tested here.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRIP-02 | `generateInviteCode` always matches `CODE_RE`; uses unambiguous alphabet; short names pad correctly | unit | `npx vitest run src/lib/utils/invite-code.test.ts` | ❌ Wave 0 (extend existing file) |
| UI-05 | `formatTripRange` single/range/cross-month/cross-year/empty in es-MX, local-parsed (no off-by-one) | unit | `npx vitest run src/lib/utils/date-format.test.ts` | ❌ Wave 0 |
| UI-05 | `toLocalDateString`/`parseLocalDate` round-trip without UTC shift | unit | `npx vitest run src/lib/utils/date-format.test.ts` | ❌ Wave 0 |
| TRIP-01/03/05/06/07/08/09 | full create→share→see→manage flow | manual-only | device UAT (no harness for Server Actions + live Supabase) | n/a |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched test file>`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green + `tsc --noEmit` + `npm run build` before `/gsd:verify-work`; then on-device UAT for the create→share→manage flow (mirrors Phase 1's device-UAT gate).

### Wave 0 Gaps
- [ ] Extend `src/lib/utils/invite-code.test.ts` — add `generateInviteCode` cases (CODE_RE match, alphabet exclusions O/I/L/0/1, 1-char-name padding, prefix strips non-alpha).
- [ ] `src/lib/utils/date-format.test.ts` — covers UI-05 (single/range/empty/cross-boundary + round-trip).
- No framework install needed (vitest present).

## Security Domain

`security_enforcement` config not located in this session; treating as enabled (absent = enabled).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Anonymous Supabase session; identity always from server `getUser()`/`signInAnonymously()`, never client input (Phase 1 pattern) |
| V3 Session Management | yes | `@supabase/ssr` cookie session; cookie writes only in route handler / Server Action (Phase 1 boundary) |
| V4 Access Control | yes | RLS: `trips` creator-only UPDATE/DELETE; `trip_members` admin-remove + self-leave; member-gated SELECT via `is_trip_member()` — all already shipped |
| V5 Input Validation | yes | Zod schema on create/edit (name 1–80, optional desc, `end >= start`); `CODE_RE` on codes |
| V6 Cryptography | no (n/a) | invite_code is a display capability code, not a secret; vestigial `invite_token` uuid covers any crypto need. Do not hand-roll crypto. |

### Known Threat Patterns for Next.js + Supabase RLS
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spoofing `created_by`/`user_id` from client | Spoofing | Identity from server session only (Pattern 1) |
| Service-role key leak to client | Information Disclosure | Key is server-only (`SUPABASE_SECRET_KEY`, never `NEXT_PUBLIC_*`); used only in `'use server'` files |
| Privilege escalation (non-admin removes members) | Elevation of Privilege | `trip_members` DELETE RLS allows only admin-remove or self-leave |
| Cross-trip data read | Information Disclosure | `is_trip_member()` gates every SELECT; not-yet-members resolve only a trip id via the SECURITY DEFINER resolver |
| Over-broad service-role mutation | Tampering | Service-role used ONLY for the create path's two bounded inserts with server-derived identity; edit/remove/delete run under normal RLS |

## Sources

### Primary (HIGH confidence)
- Repo files read this session: `src/actions/members.ts`, `src/lib/utils/invite-code.ts`, `src/lib/utils/avatar.ts`, `src/components/profile/UserAvatar.tsx`, `src/components/auth/InviteCodeForm.tsx`, `src/app/join/[code]/route.ts`, `src/app/t/[tripId]/layout.tsx`, `src/components/layout/TripSwitcherSheet.tsx`, `src/app/t/[tripId]/gente/page.tsx`, `src/app/page.tsx`, `src/i18n/es.ts`, `src/types/database.ts`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/button.tsx`, `components.json`, `package.json`, `vitest.config.ts`, both migrations.
- npm registry: react-day-picker 10.0.1 metadata (age, downloads, peerDeps, repo) [VERIFIED]
- node `Intl.DateTimeFormat('es-MX')` behavior verified in-session (single/range/timezone) [VERIFIED]

### Secondary (MEDIUM confidence)
- [react-day-picker range mode](https://daypicker.dev/selections/range-mode) — `mode="range"`, `DateRange`, `required` semantics [CITED]
- [shadcn Calendar](https://ui.shadcn.com/docs/components/calendar) — install + range usage [CITED]
- [MDN clipboard writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — secure-context + gesture requirement [CITED]

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every reuse is read directly from the repo; the one new package verified on npm.
- Architecture (service-role create, RLS reuse): HIGH — patterns are verbatim from device-verified Phase 1 code; RLS read from migrations.
- Pitfalls (timezone, trigger trap, collision): HIGH — timezone verified in-session; trigger trap reasoned from the actual `trips` INSERT policy.
- Realtime-vs-refetch recommendation: MEDIUM — depends on user's reading of "instantly" (A2).

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stack is stable; react-day-picker is the only moving piece)
