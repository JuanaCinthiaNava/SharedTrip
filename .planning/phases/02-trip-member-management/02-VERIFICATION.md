---
phase: 02-trip-member-management
verified: 2026-06-05T20:30:00Z
status: human_needed
score: 5/5 must-haves verified (SC5 resolved post-verify)
overrides_applied: 0
re_verification: "2026-06-05 — SC5/UI-05 date-display gap CLOSED: formatTripRange wired into the Gente page trip header (commit 48e7ed9); tsc + production build clean. The four items below are genuine device/runtime UAT, not code gaps — same terminal posture as Phase 1."
gaps: []
deferred: []
human_verification:
  - test: "Trip dates render on screen in es-MX format (SC5/UI-05) — RESOLVED in code (commit 48e7ed9)"
    expected: "On a trip with dates set, the Gente page trip header shows the range via formatTripRange (e.g. '5–12 de jun de 2026'); a trip with no dates shows no date row (D-03). Confirm visually on device."
    why_human: "Code now renders dates (formatTripRange on the Gente trip header); only visual confirmation of the rendered format remains."
  - test: "Anonymous trip creation works end-to-end on a fresh device"
    expected: "User with no prior session visits /, taps 'Crear viaje', fills a trip name, and lands inside /t/[id]/gente as the trip admin with a generated invite code visible on the InviteCard"
    why_human: "The create flow touches signInAnonymously() cookie-write inside a route handler, which requires an HTTPS context and a real browser session. Can only be confirmed on a real device or Vercel preview."
  - test: "Clipboard copy of invitation produces correct message"
    expected: "Tapping 'Copiar invitación' on the InviteCard shows a 'Copiado' toast and pastes a message containing the deep-link (e.g. https://sharedtrip.vercel.app/join/MARR-4F9K) AND the bare code"
    why_human: "navigator.clipboard requires a secure context (HTTPS) and a user gesture. Cannot be verified by grep."
  - test: "Edit trip changes are visible to another member on next navigation"
    expected: "Creator edits the trip name; another member in a different browser tab navigates to the Gente tab and sees the new name without a hard reload"
    why_human: "revalidatePath + router.refresh() is the refresh model. Verifying 'next-view' freshness requires two browser sessions and runtime observation."
  - test: "Creator removes a member; removed member is bounced to / on next navigation"
    expected: "Creator taps 'Quitar' on a member row, confirms; the row disappears immediately (router.refresh). The removed member navigating to any /t/[tripId]/* route is redirected to / by the layout null-trip guard."
    why_human: "Requires two concurrent sessions and runtime observation of the layout RLS redirect."
---

# Phase 2: Trip + Member Management — Verification Report

**Phase Goal:** Users can create a trip (anonymously), share its invite code, and manage the member list — the container that all content will live in. Trip creation generates the hybrid `invite_code`.
**Verified:** 2026-06-05T20:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | User creates a trip with name, optional dates, optional description; trip appears with a generated invite code | ✓ VERIFIED | `createTrip` in `src/actions/trips.ts` — 5-attempt loop calling `generateInviteCode`, inserts creator as `role: 'admin'` via service-role client. Route handler at `src/app/trips/new/route.ts` redirects to `/t/[id]/gente`. Create page at `/trips/nueva` renders `CreateTripForm`. |
| SC2 | Creator shares the trip's invite code; any person who types it joins | ✓ VERIFIED | `InviteCard` copies `es.invite.shareMessage(name, code, origin)` — contains both the deep-link (`/join/[code]`) and the bare code. Joins use the Phase 1 `joinTripByCode` action (unchanged, verified in Phase 1). |
| SC3 | All members see the member list with names + avatars/initials; creator can remove, members can leave | ✓ VERIFIED | `MemberList` + `MemberRow` render `UserAvatar` + display name + `Creador`/`Tú` badges. `removeMember` and `leaveTrip` in `src/actions/members.ts` run under normal RLS with AlertDialog confirms. Creator-removal guard prevents orphaning. Creator's own row shows no action (D-15). |
| SC4 | Creator edits trip name/dates/description; changes reflect on next view/navigation (revalidatePath + router.refresh; Realtime deferred to Phase 4 — confirmed 2026-06-05) | ✓ VERIFIED | `updateTrip` in `src/actions/trips.ts` calls `normalizeTripInput` (server-side validation), updates under creator-only UPDATE RLS, then `revalidatePath('/t/${tripId}', 'layout')`. `EditTripSheet` calls `router.refresh()` on success. No service-role used. |
| SC5 | Trip dates display in es-MX format consistently | ? UNCERTAIN | `formatTripRange` helper exists (`src/lib/utils/date-format.ts`), uses `Intl.DateTimeFormat('es-MX')`, passes all 8 unit tests. `parseLocalDate`/`toLocalDateString` are used in `CreateTripForm` and `EditTripSheet`. However, **no app component currently renders trip dates to the user** — the top header, TripSwitcherSheet, and GentePage do not display dates. Dates are stored and round-trip correctly through the edit form but are not visible anywhere on screen. UI-SPEC §7 specifies dates appear in "trip header, trip switcher list, trip/member cards." None of these surfaces show dates. Needs human decision: intentionally deferred or missing display surface. |

**Score:** 4/5 truths verified (SC5 uncertain)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/utils/invite-code.ts` | `generateInviteCode(name)` generator | ✓ VERIFIED | Exports `generateInviteCode`, `SUFFIX_ALPHABET` (excludes O/I/L/0/1), `CODE_RE`, `normalizeInviteCode`, `isWellFormedInviteCode` |
| `src/lib/utils/date-format.ts` | es-MX date helpers | ✓ VERIFIED | Exports `parseLocalDate`, `toLocalDateString`, `formatTripRange`. Uses `Intl.DateTimeFormat('es-MX')`. No `.toISOString()` or `new Date(str)` (confirmed by grep). |
| `src/i18n/es.ts` | `trip`, `members`, `invite` namespaces | ✓ VERIFIED | All three namespaces present. Function members: `shareMessage`, `deleteConfirmLabel`, `removeDialogHeading`, `leaveDialogHeading` all confirmed. |
| `src/components/ui/calendar.tsx` | shadcn Calendar primitive | ✓ VERIFIED | File exists (installed via CLI) |
| `src/components/ui/textarea.tsx` | shadcn Textarea primitive | ✓ VERIFIED | File exists (installed via CLI) |
| `src/actions/trips.ts` | `createTrip`, `updateTrip`, `deleteTrip` Server Actions | ✓ VERIFIED | All three exported. `createTrip` uses service-role (SUPABASE_SECRET_KEY). `updateTrip`/`deleteTrip` use plain SSR client under RLS. `normalizeTripInput` shared validator covers both create and update (CR-01 fix). |
| `src/app/trips/new/route.ts` | POST route handler | ✓ VERIFIED | Exports `POST`, validates name, calls `createTrip`, redirects to `/t/[id]/gente` on success |
| `src/app/trips/nueva/page.tsx` | Create trip page | ✓ VERIFIED | RSC page at `/trips/nueva` renders `CreateTripForm` |
| `src/components/trip/CreateTripForm.tsx` | RHF + Zod v4 create form | ✓ VERIFIED | Uses `zodResolver`, `mode: 'onBlur'`, `z.string().trim().min(1)`, end>=start refine, `toLocalDateString` for date serialization. No `.toISOString()`. Accepts optional `defaultValues` + `onSubmit` override for edit reuse. Error handling with `toast.error` + try/catch (WR-06 fix). |
| `src/components/trip/TripDatePicker.tsx` | Clearable range date picker | ✓ VERIFIED | `mode="range"`, no `required` prop on Calendar, "Sin fechas todavía" button calls `onChange(undefined)` |
| `src/app/t/[tripId]/gente/page.tsx` | RSC member-list page | ✓ VERIFIED | Selects `trip_members JOIN profiles`, renders `InviteCard` + `MemberList` + `EditTripSheet` + `DeleteTripDialog`. Creator-only gating via `isCreator = currentUserId === creatorId`. |
| `src/components/members/MemberRow.tsx` | Avatar + name + role badge row | ✓ VERIFIED | Renders `UserAvatar size="md"`, `badgeCreator` (coral-tinted `bg-primary/15 text-primary`), `badgeYou` (neutral border), AlertDialog confirm for remove/leave actions |
| `src/components/members/InviteCard.tsx` | Code display + clipboard copy | ✓ VERIFIED | `navigator.clipboard.writeText(es.invite.shareMessage(...))`, success toast `copiedToast`, error fallback. Code renders `text-accent tracking-wide tabular-nums`. |
| `src/components/layout/TripSwitcherSheet.tsx` | Wired Crear nuevo viaje entry | ✓ VERIFIED | No `disabled` attribute. `<Link href="/trips/nueva">` with `es.tripSwitcher.createCta` text. |
| `src/actions/members.ts` | `removeMember` + `leaveTrip` Server Actions | ✓ VERIFIED | Both exported. Plain SSR client (no SUPABASE_SECRET_KEY). Creator-removal guard (WR-04 fix). `revalidatePath` after success. |
| `src/components/trip/EditTripSheet.tsx` | Edit surface reusing CreateTripForm | ✓ VERIFIED | Imports and renders `<CreateTripForm defaultValues={...} onSubmit={handleSubmit}>`. Uses `updateTrip`. No `new Date(str)` — dates seeded via `parseLocalDate` in `CreateTripForm`. `router.refresh()` on success. |
| `src/components/trip/DeleteTripDialog.tsx` | Type-name-to-confirm delete | ✓ VERIFIED | AlertDialog with controlled Input. `isConfirmed = confirmValue === name` (trim-exact). Confirm button `disabled={!isConfirmed || isPending}`. Calls `deleteTrip`, then `router.push('/')`. No archive path. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/trip/CreateTripForm.tsx` | `/trips/new` | `fetch('/trips/new', { method: 'POST' })` | ✓ WIRED | Line 125: `fetch('/trips/new', {...})`. Route handler at `src/app/trips/new/route.ts` confirmed. |
| `src/actions/trips.ts createTrip` | `trip_members` | service-role upsert `role: 'admin'` | ✓ WIRED | Lines 150–155: `admin.from('trip_members').upsert({ ..., role: 'admin' }, ...)`. |
| `src/app/page.tsx` | `src/components/trip/CreateTripForm` | via `/trips/nueva` secondary Link | ✓ WIRED | Page links to `/trips/nueva`; `nueva/page.tsx` renders `<CreateTripForm />`. |
| `src/app/t/[tripId]/gente/page.tsx` | `trip_members` | RSC select JOIN profiles, RLS-gated | ✓ WIRED | Line 45: `.from('trip_members').select('user_id, role, profiles(display_name, avatar_seed)')`. |
| `src/components/members/InviteCard.tsx` | `navigator.clipboard` | `clipboard.writeText(shareMessage(...))` | ✓ WIRED | Line 28: `await navigator.clipboard.writeText(message)`. |
| `src/components/layout/TripSwitcherSheet.tsx` | create flow | `<Link href="/trips/nueva">` | ✓ WIRED | Line 66: `href="/trips/nueva"`, no `disabled` attribute. |
| `src/components/members/MemberRow.tsx` | `removeMember`/`leaveTrip` | AlertDialog confirm → action → router.refresh/push | ✓ WIRED | Lines 78, 91: `removeMember(tripId, userId)` and `leaveTrip(tripId)` imported and called. |
| `src/components/trip/EditTripSheet.tsx` | `updateTrip` | `CreateTripForm onSubmit` override | ✓ WIRED | Line 52: `await updateTrip(tripId, values)`. |
| `src/components/trip/DeleteTripDialog.tsx` | `deleteTrip` | type-name confirm → `deleteTrip` → redirect | ✓ WIRED | Lines 46, 50: `await deleteTrip(tripId)` then `router.push('/')`. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `gente/page.tsx` | `trip.invite_code`, `members[]` | `supabase.from('trips').select(...)` + `supabase.from('trip_members').select(...)` | Yes — live DB queries under RLS | ✓ FLOWING |
| `InviteCard.tsx` | `code` prop | Passed from `gente/page.tsx` (DB-fetched `trip.invite_code`) | Yes | ✓ FLOWING |
| `MemberList.tsx` / `MemberRow.tsx` | `members[]` prop | Passed from `gente/page.tsx` (DB-fetched `trip_members JOIN profiles`) | Yes — avatarSeed + displayName from real profile rows | ✓ FLOWING |
| `EditTripSheet.tsx` | `name`, `startDate`, `endDate`, `description` props | Passed from `gente/page.tsx` (DB-fetched trip fields) | Yes — pre-fills form from live trip data | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `generateInviteCode` always CODE_RE-valid (500 iterations) | `npx vitest run invite-code.test.ts` | 52 tests pass | ✓ PASS |
| SUFFIX_ALPHABET excludes O/I/L/0/1 | `echo "ABCDEFGHJKMNPQRSTUVWXYZ23456789" \| grep "[OIL01]"` | 0 matches | ✓ PASS |
| date-format no UTC off-by-one | `npx vitest run date-format.test.ts` | 8 tests pass including round-trip + "5 jun 2026" check | ✓ PASS |
| es.ts function members present | `grep shareMessage es.ts` | All 4 function members confirmed | ✓ PASS |
| `normalizeTripInput` covers both create and update | grep in `trips.ts` | Called at line 79 (createTrip) and line 181 (updateTrip) | ✓ PASS |
| Service-role not used in update/delete/leave/remove | `grep SUPABASE_SECRET_KEY` in each function scope | 0 matches in all 4 functions | ✓ PASS |
| Creator-removal guard present | grep `trips.ts` `created_by === targetUserId` | Line 174 confirmed | ✓ PASS |
| No `disabled` in TripSwitcherSheet create button | grep `disabled` | No output | ✓ PASS |
| No `.toISOString()` / `new Date(str)` in date-handling code | grep across `date-format.ts`, `CreateTripForm.tsx`, `EditTripSheet.tsx` | Only comments/docstrings warning against it; `new Date(y, m-1, d)` (safe) in `parseLocalDate` | ✓ PASS |

---

### Probe Execution

No probes declared for this phase. Step 7c: SKIPPED (no `scripts/*/tests/probe-*.sh` files for this phase).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TRIP-01 | 02-02 | Usuario autenticado puede crear un trip con nombre, fechas y descripción opcional | ✓ SATISFIED | `createTrip` action + `CreateTripForm` + `/trips/nueva` page |
| TRIP-02 | 02-01, 02-02, 02-03 | Creador genera invite code compartible (token único) | ✓ SATISFIED | `generateInviteCode` in `invite-code.ts`; `InviteCard` clipboard share |
| TRIP-03 | 02-02 | Cualquiera con el code puede unirse | ✓ SATISFIED | Phase 1 `joinTripByCode` + `/join/[code]` route (unchanged); invite code stored on trip |
| TRIP-04 | 02-03 | Usuario puede ver la lista de trips (switch) | ✓ SATISFIED | `TripSwitcherSheet` wired with create entry; trip list rendered from layout query |
| TRIP-05 | 02-03 | Miembros pueden ver la lista de demás miembros | ✓ SATISFIED | `MemberList` + `MemberRow` with UserAvatar + display name + badges |
| TRIP-06 | 02-04 | Creador puede remover miembros | ✓ SATISFIED | `removeMember` action + AlertDialog confirm in `MemberRow` |
| TRIP-07 | 02-04 | Cualquier miembro puede salir (excepto creador) | ✓ SATISFIED | `leaveTrip` action + AlertDialog confirm; creator row shows no leave action (D-15) |
| TRIP-08 | 02-05 | Creador puede editar nombre, fechas y descripción | ✓ SATISFIED | `updateTrip` action + `EditTripSheet` reusing `CreateTripForm` pre-filled |
| TRIP-09 | 02-05 | Creador puede eliminar trip | ✓ SATISFIED | `deleteTrip` action + `DeleteTripDialog` type-name-to-confirm, hard delete with ON DELETE CASCADE |
| UI-05 | 02-01, 02-05 | Fechas formateadas con `Intl.DateTimeFormat('es-MX')` consistentemente | ? NEEDS HUMAN | Helper exists, tested, used in form serialization — but **no view currently displays trip dates to the user**. The UI-SPEC §7 specifies dates should appear in "trip header, trip switcher list, trip/member cards." None of these surfaces render dates. |

**Orphaned requirements check:** All 10 Phase-2 requirements (TRIP-01 through TRIP-09 + UI-05) appear in at least one plan's `requirements:` field. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`/`FIXME`/`XXX` markers found in any phase-2 file | — | None |
| — | — | No hardcoded Spanish strings in JSX (all via `es.ts`) | — | None |
| — | — | No UTC-unsafe date construction (`new Date(str)` / `.toISOString()` for date-only values) | — | None |

Note: The code review (02-REVIEW.md) identified several warnings (WR-01 through WR-06). Three were fixed post-execution in commits `e9ac0f2` and `0c24dd8` (CR-01 server-side validation, WR-04 creator-removal guard, WR-06 form error handling). Remaining review items (WR-01 redirect inconsistency, WR-02 description cap in route handler, WR-03 redundant identity props, WR-05 transient-error identity minting, IN-02 revalidatePath style, IN-03 fragile control flow, IN-04 dead actionSlot prop) are code quality concerns already documented in 02-REVIEW.md; none block the phase goal.

---

### Post-Review Fixes Verified

| Fix | Issue | Evidence |
|-----|-------|---------|
| Server-side validation on createTrip + updateTrip | CR-01 | `normalizeTripInput()` defined at `trips.ts:41–64`, called at lines 79 (createTrip) and 181 (updateTrip). Validates name 1–80, date format YYYY-MM-DD, end>=start, description trimmed+capped to 500. |
| Creator-removal guard in removeMember | WR-04 | `members.ts:169–175`: fetches `trips.created_by`, returns error if `targetUserId === trip.created_by`. |
| Create form error handling | WR-06 | `CreateTripForm.tsx:131–141`: `else { toast.error(...) }` branch + `catch { toast.error(...) }` wrapping the fetch. |

---

### Service-Role Boundary Verification

| Action | Client Used | Correct? |
|--------|------------|----------|
| `createTrip` | Service-role (`SUPABASE_SECRET_KEY`) — trips insert + creator membership insert | Yes — RLS chicken-and-egg requires service-role for freshly-minted anon session |
| `joinTripByCode` (Phase 1) | Service-role (`SUPABASE_SECRET_KEY`) — trip_members upsert | Yes — same anon-session-cookie timing reason |
| `updateTrip` | Plain SSR client (`createClient()`) under creator-only UPDATE RLS | Yes — creator session is present at edit time |
| `deleteTrip` | Plain SSR client (`createClient()`) under creator-only DELETE RLS | Yes |
| `removeMember` | Plain SSR client (`createClient()`) under admin-remove DELETE RLS | Yes |
| `leaveTrip` | Plain SSR client (`createClient()`) under self-leave DELETE RLS | Yes |

Zero occurrences of `SUPABASE_SECRET_KEY` in the function bodies of `updateTrip`, `deleteTrip`, `removeMember`, or `leaveTrip` (confirmed by grep).

---

### Human Verification Required

#### 1. Trip dates visible to user somewhere on screen (SC5 / UI-05)

**Test:** Create a trip with a date range (e.g. June 5–12, 2026). Navigate to the Gente tab, the top header, and the trip switcher. Look for the dates displayed in Spanish format.
**Expected:** Dates appear somewhere (header subtext, switcher row, or Gente page heading) formatted as es-MX (e.g. "5–12 de jun de 2026").
**Why human:** `formatTripRange` exists and is unit-tested, but **no current component renders trip dates to the user**. The top header shows only the trip name; the trip switcher shows only the trip name; the Gente page fetches `start_date`/`end_date` but only passes them to `EditTripSheet` (for pre-filling the form — they are not rendered as text). UI-SPEC §7 says dates should appear in "trip header, trip switcher list, trip/member cards." This gap may be intentional (dates deferred to a later phase's display surface) or it may be a missing rendering that should be added. A human must decide whether SC5 is satisfied or needs a display surface.

#### 2. Anonymous trip creation end-to-end (fresh device)

**Test:** Open a private browser window (no prior session), go to `/`, tap "Crear viaje", fill in a trip name, submit.
**Expected:** User lands at `/t/[id]/gente` as the trip admin. The InviteCard displays a generated invite code (format like `CANC-3R7X`). The Gente tab shows the user as the sole member with a "Creador" badge.
**Why human:** `signInAnonymously()` inside a route handler writes the session cookie to the HTTP response. This sequence requires a real browser + HTTPS context to test.

#### 3. Clipboard copy produces correct message format

**Test:** On the Gente tab, tap "Copiar invitación". Paste the clipboard contents.
**Expected:** Message contains (a) a deep-link like `https://[domain]/join/CANC-3R7X` and (b) the bare code `CANC-3R7X`. A "Copiado" toast appears.
**Why human:** `navigator.clipboard` requires HTTPS + user gesture — cannot be invoked by grep.

#### 4. Edit trip changes are visible to another member on next navigation (SC4)

**Test:** Creator edits the trip name from "Cancún 2026" to "Cancún Actualizado". In another browser tab (or device) signed in as a different member, navigate away from and back to the Gente tab (or any trip page).
**Expected:** The updated trip name appears without requiring a hard browser reload. The editor sees the update immediately after `router.refresh()`.
**Why human:** Next.js `revalidatePath` + `router.refresh()` freshness guarantee requires two runtime sessions to observe.

#### 5. Creator removes a member; removed member is bounced on next navigation (SC3 / D-13)

**Test:** Creator taps "Quitar" on a non-creator member's row, confirms in the AlertDialog. The row disappears. The removed member then navigates to any `/t/[tripId]/*` route.
**Expected:** Row disappears after `router.refresh()`. Removed member is redirected to `/` by the layout null-trip guard (RLS returns null for a non-member querying the trip).
**Why human:** Requires two simultaneous browser sessions.

---

### Gaps Summary

No blocking gaps found. All required artifacts exist and are substantively implemented. The only unresolved item is SC5 (trip date display) which is UNCERTAIN, not FAILED — the underlying helper is correct and tested, but there is no current UI surface rendering dates to the user. This needs a human decision on whether it is intentionally deferred (no display surface planned for Phase 2) or an omission.

---

_Verified: 2026-06-05T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
