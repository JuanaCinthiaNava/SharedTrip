---
phase: 02-trip-member-management
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - src/actions/members.ts
  - src/actions/trips.ts
  - src/app/page.tsx
  - src/app/t/[tripId]/gente/page.tsx
  - src/app/trips/new/route.ts
  - src/app/trips/nueva/page.tsx
  - src/components/layout/TripSwitcherSheet.tsx
  - src/components/members/InviteCard.tsx
  - src/components/members/MemberList.tsx
  - src/components/members/MemberRow.tsx
  - src/components/trip/CreateTripForm.tsx
  - src/components/trip/DeleteTripDialog.tsx
  - src/components/trip/EditTripSheet.tsx
  - src/components/trip/TripDatePicker.tsx
  - src/components/ui/calendar.tsx
  - src/components/ui/textarea.tsx
  - src/i18n/es.test.ts
  - src/i18n/es.ts
  - src/lib/utils/date-format.test.ts
  - src/lib/utils/date-format.ts
  - src/lib/utils/invite-code.test.ts
  - src/lib/utils/invite-code.ts
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-06-05
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the trip + member management surface. The security-sensitive service-role boundary is, on the whole, implemented correctly: `createTrip` and `joinTripByCode` are the only callers of the service-role client, identity is always taken from the server session (`getUser`/`signInAnonymously`), `SUPABASE_SECRET_KEY` is server-only (not `NEXT_PUBLIC_`), the invite-code collision loop is bounded (5 attempts, fail-closed), and `updateTrip`/`deleteTrip`/`removeMember`/`leaveTrip` correctly use the plain SSR client under RLS. Date handling uses the local-date helpers consistently — no `new Date('YYYY-MM-DD')` or `.toISOString()` on date-only values in the reviewed code. No hardcoded Spanish strings outside `es.ts` and no raw hex colors.

The dominant defect class is **missing server-side input validation on the mutating server actions** (`createTrip`, `updateTrip`). These are `'use server'` actions — directly invocable RPC endpoints — and they trust their input shape entirely. The route handler validates `name` for the create path, but `updateTrip` has no equivalent guard, and neither path enforces the `description` length or the `end >= start` invariant on the server. There is also a UX-breaking redirect inconsistency and an unauthorized-action gap that lets a non-creator member trigger `removeMember` against another member (the call is RLS-blocked server-side, but the UI exposes the affordance under a flawed gate in one configuration).

## Critical Issues

### CR-01: `updateTrip` server action performs no input validation — empty/oversized name and unvalidated date range can be persisted

**File:** `src/actions/trips.ts:133-159`
**Issue:** `updateTrip` is a `'use server'` action and is therefore a directly-callable endpoint. Unlike the create path (which validates `name` in `src/app/trips/new/route.ts:29-34`), `updateTrip` writes `input.name`, `input.startDate`, `input.endDate`, `input.description` straight to the DB with no validation. The only client that calls it (`EditTripSheet` → `CreateTripForm`) validates via Zod, but a server action must not trust client-side validation — an attacker (or a future second caller) can invoke it with `name: ""`, an 8000-char name, `startDate` after `endDate`, or a non-`YYYY-MM-DD` string. The RLS policy only authorizes *who* can update; it does not constrain *what* values are written. Result: a trip can be left with an empty name (breaks the delete-confirm gate and trip switcher), a date range that violates the `end >= start` invariant the UI promises, or a malformed date string that later crashes `parseLocalDate`/`formatTripRange`.

**Fix:** Validate on the server before the update. Share the Zod object schema between `CreateTripForm` and the actions, or inline-guard:

```ts
export async function updateTrip(tripId: string, input: {...}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: es.errors.sessionExpired }

  // Server-side validation — never trust client Zod
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 80) return { error: es.trip.invalidName }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const startDate = input.startDate && dateRe.test(input.startDate) ? input.startDate : null
  const endDate = input.endDate && dateRe.test(input.endDate) ? input.endDate : null
  if (startDate && endDate && endDate < startDate) return { error: es.trip.invalidDateRange }

  const description =
    typeof input.description === 'string' && input.description.trim()
      ? input.description.trim().slice(0, 500)
      : null

  const { error } = await supabase
    .from('trips')
    .update({ name, description, start_date: startDate, end_date: endDate })
    .eq('id', tripId)
  // ...
}
```

Apply the same `description` length cap and date-range check to the create path (`createTrip` / `src/app/trips/new/route.ts`), which today validates only `name`.

## Warnings

### WR-01: Post-create redirect lands on `/gente` but post-join and the welcome-redirect land on `/docs` — inconsistent entry tab

**File:** `src/app/trips/new/route.ts:51` (vs `src/app/join/[code]/route.ts` success redirect to `/docs` and `src/app/page.tsx:37` redirect to `/docs`)
**Issue:** Creating a trip redirects to `/t/${tripId}/gente`, while joining a trip and the returning-member welcome redirect both go to `/t/${tripId}/docs`. The create-path comment says this is intentional ("so the creator immediately sees the invite card"), which is defensible, but it is an undocumented divergence from the two other entry points and will surprise the creator who expects the same landing tab as every subsequent visit. Confirm this is a deliberate product decision; if not, align to `/docs`.

**Fix:** Either document the intentional difference in the phase decisions, or change `src/app/trips/new/route.ts:51` to `${origin}/t/${result.tripId}/docs` for consistency.

### WR-02: `description` length (max 500) is enforced only client-side — not in the create route handler

**File:** `src/app/trips/new/route.ts:38-41`
**Issue:** `CreateTripForm` Zod schema enforces `z.string().max(500)` on `description`, but the route handler accepts any string of any length and passes it to `createTrip` unbounded. Same root cause as CR-01 (client validation is not a server boundary). A direct POST with a multi-megabyte `description` is persisted, contributing to DB bloat against the 500 MB free-tier ceiling and rendering an unbounded blob into every member's Gente/trip view.

**Fix:** In `src/app/trips/new/route.ts`, cap the description: `const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim().slice(0, 500) : null`.

### WR-03: `removeMember` affordance gate allows a non-creator to see/trigger "Quitar" on other members when `currentUserId === creatorId` is incorrectly true

**File:** `src/components/members/MemberRow.tsx:63,70`
**Issue:** `viewerIsCreator` is computed as `currentUserId && creatorId && currentUserId === creatorId`. This is correct *only if* the parent always passes the real current user. In `gente/page.tsx` it does. However, the row also derives `isCreator` (passed separately as `member.user_id === creatorId`) and `isCurrentUser` independently, so the component has two parallel notions of "who is the creator" that can disagree if a future caller passes them inconsistently. More concretely: the server action `removeMember` is the real authorization boundary and is RLS-protected, so a non-creator cannot actually remove anyone — but the UI will optimistically show the "Quitar" button and then surface a generic network error toast on the RLS denial, which is a confusing UX failure rather than a clean "no permiso". Today the gate happens to be safe because the page computes everything from `user.id`; flag for hardening.

**Fix:** Collapse the redundant identity props — derive `viewerIsCreator` once at the page level and pass a single `canManage` boolean down, rather than re-deriving creator identity inside the row from loosely-coupled props. The server-side RLS denial path should also map to a permission-specific message instead of `es.errors.genericNetwork`.

### WR-04: A non-creator member who is the *last* member cannot recover, and creator-leave is impossible by design — verify no trip-orphaning path

**File:** `src/actions/members.ts:121-141` (`leaveTrip`) and `src/components/members/MemberRow.tsx:71`
**Issue:** `showLeave` is `isOwnRow && !viewerIsCreator`. The creator has no "Salir" (delete is their only exit, by D-15). That is intentional. But trace the state: if every non-creator leaves and the creator deletes the trip, fine. However, there is no guard preventing a scenario where `removeMember`/`leaveTrip` operate on a `trip_members` set such that the creator's own admin row is the only thing keeping the trip reachable — and `removeMember` (`src/actions/members.ts:155-178`) does not exclude `targetUserId === creatorId`. RLS may or may not forbid the creator removing their own row; if it does not, a creator could `removeMember(tripId, creatorId)` via a crafted call and orphan the trip (rows exist, no admin, delete affordance gone). Confirm the `trip_members` DELETE policy and/or add an explicit `if (targetUserId === creator) return error` guard.

**Fix:** In `removeMember`, fetch `trips.created_by` and reject removal of the creator: `if (targetUserId === creatorId) return { error: es.errors.genericNetwork }` (or a dedicated message). Do not rely solely on the UI never offering the button.

### WR-05: `joinTripByCode` re-join for an *existing* authenticated user relies on `getUser()` not erroring, but the comment-justified "don't short-circuit on error" path can mint a duplicate anon user

**File:** `src/actions/members.ts:50-69`
**Issue:** The logic branches on `existingUser` truthiness, ignoring the `getUser()` error. If `getUser()` returns `{ user: null, error: <transient> }` for a user who *does* have a valid-but-momentarily-unreadable session (e.g. a transient cookie/refresh hiccup rather than a real sign-out), the code falls into `signInAnonymously()` and creates a brand-new anonymous identity, silently abandoning the user's existing membership and creating an orphaned anon user. The accompanying comment frames every non-zero-status error as "should mint a fresh session," which over-generalizes from the sign-out case. This is a latent correctness/identity bug, not just style.

**Fix:** Distinguish "no session" (`AuthSessionMissingError`) from transient transport errors. Only mint a new anon session when the error indicates a genuinely absent session; on a transient error, return `es.errors.genericNetwork` so the user retries with their real identity intact.

### WR-06: `CreateTripForm` swallows the failure branch of the create POST — no error surfaced when `!res.ok && !res.redirected`

**File:** `src/components/trip/CreateTripForm.tsx:130-134`
**Issue:** After the fetch, the handler navigates only when `res.ok || res.redirected`. If the route handler returns a non-redirect error response (or the fetch resolves with a 4xx/5xx that is not followed), nothing happens: no toast, no navigation, the spinner clears and the user is left on the form with no feedback. The route handler currently always redirects, so this is latent today, but any future error response (or a network failure that resolves rather than rejects) becomes a silent dead-end. Note also there is no `catch` for a rejected fetch (offline), so a thrown fetch leaves `isPending` stuck until the transition settles with an unhandled rejection.

**Fix:** Add an `else` branch that shows `toast.error(es.errors.genericNetwork)`, and wrap the fetch in try/catch to surface network failures:

```ts
try {
  const res = await fetch('/trips/new', {...})
  if (res.ok || res.redirected) { router.push(res.url) }
  else { toast.error(es.errors.genericNetwork) }
} catch {
  toast.error(es.errors.genericNetwork)
}
```

## Info

### IN-01: `createTrip` retry loop regenerates the invite code from `input.name` every attempt, so a degenerate prefix keeps colliding in the same narrow keyspace

**File:** `src/actions/trips.ts:78-102`
**Issue:** `generateInviteCode(input.name)` produces a deterministic prefix (first ≤4 alpha chars) plus a 4-char suffix from a 31-char alphabet. For a popular trip name the prefix is fixed, so retries only re-roll the suffix (~923K combinations) — fine at MVP scale, but the loop silently caps at 5 attempts and fails closed with a generic network error, giving the user no actionable signal. Acceptable for <10 users; note for scale.

**Fix:** None required at MVP scale. If collisions ever surface, widen the suffix or add jitter to the prefix on later attempts.

### IN-02: `revalidatePath('/t/[tripId]/gente', 'page')` uses the literal bracket route; confirm it matches Next.js 16 dynamic-segment revalidation semantics

**File:** `src/actions/members.ts:139,176`
**Issue:** `leaveTrip`/`removeMember` revalidate the literal `'/t/[tripId]/gente'` with type `'page'`, while `updateTrip` revalidates the *concrete* path `'/t/${tripId}'` with `'layout'`. The two styles are inconsistent. The bracketed form is valid for dynamic routes in Next.js, but mixing it with concrete-path revalidation elsewhere is a maintenance smell and easy to get subtly wrong.

**Fix:** Standardize: prefer `revalidatePath(\`/t/${tripId}/gente\`, 'page')` (concrete) for clarity and to match `updateTrip`'s convention.

### IN-03: `EditTripSheet.handleSubmit` wraps `startTransition` in a `Promise` and resolves inside the transition callback — fragile control flow

**File:** `src/components/trip/EditTripSheet.tsx:50-62`
**Issue:** The handler awaits a Promise whose `resolve` is called inside the `startTransition` async callback. `startTransition` does not await its callback, so the outer `await` and the transition's pending state are decoupled — `isPending` (destructured away as `[, startTransition]`) is unused, and the `await onSubmitOverride(...)` in `CreateTripForm` resolves based on this manual Promise, not the actual transition. It works but is non-obvious and brittle.

**Fix:** Either drop the manual Promise and let the parent's `useTransition` own pending state, or call `updateTrip` directly with a local `isPending` boolean. Remove the unused `useTransition` destructure if not used.

### IN-04: `MemberRow` keeps a dead `actionSlot` backwards-compat path that no current caller uses

**File:** `src/components/members/MemberRow.tsx:38,53,192-197`
**Issue:** `actionSlot` and its render branch are documented as backwards-compat but `MemberList` (the only caller) never passes it. Dead prop + dead branch increases surface area and the `!showRemove && !showLeave && actionSlot` condition adds cognitive load.

**Fix:** Remove `actionSlot` and its branch unless a planned caller needs it; otherwise document the intended future caller.

---

_Reviewed: 2026-06-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
