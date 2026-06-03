---
phase: 01-foundation-auth
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - supabase/migrations/20260530000006_invite_code.sql
  - supabase/migrations/20260530000004_phase1_seed_test_trip.sql
  - src/actions/members.ts
  - src/app/join/[code]/route.ts
  - src/components/auth/InviteCodeForm.tsx
  - src/lib/utils/invite-code.ts
  - src/app/page.tsx
  - src/actions/auth.ts
  - src/i18n/es.ts
  - src/components/common/SinCuentaPill.tsx
  - src/components/layout/TopHeader.tsx
  - src/app/t/[tripId]/layout.tsx
  - src/types/database.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: resolved
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

---

## Summary

Reviewed the 13 files changed by the Phase 01 invite-code re-scope (Plans 01-08 and 01-09). The
invite-code architecture is structurally sound: the SECURITY DEFINER resolver is hardened correctly
(search_path set, returns only uuid, STABLE, granted to anon+authenticated), the service-role key
is server-only and never NEXT_PUBLIC, and the magic-link code has been cleanly removed with no
dangling imports. The critical anon-join-architecture (4-fix coordination) is intact.

One Critical issue was found: the `upsert` in `joinTripByCode` uses the default PostgREST
`DO UPDATE SET ALL` conflict resolution. This silently overwrites the existing `role` column on any
duplicate join, meaning an admin user who re-enters a valid invite code loses their `admin` role
and becomes a `member`. This is a data integrity defect in the security-sensitive membership path.

Four Warnings cover: (1) a swallowed `getUser()` error that masks network failures; (2) the
backfill formula generating codes that violate `CODE_RE` for trip names shorter than 2 non-space
characters; (3) a stale Spanish UI string that tells anonymous users they need to re-enter via
email when email is not a v1 flow; and (4) the absent `CODE_RE` format check in the route handler
(only a length guard is applied, allowing malformed-but-short codes to hit the DB).

Three Info items cover: the misleading `invalidJoinToken` error message that says "link" instead of
"code"; the RPC return type in `database.ts` typed as non-nullable `string` while the SQL function
returns nullable uuid; and the missing rate-limiting on the `/join/[code]` path.

---

## Critical Issues

### CR-01: Upsert overwrites `role` on duplicate join — admin can be silently demoted to member

**Status:** RESOLVED — commit `06ce528` (fix(01): CR-01 prevent role downgrade on invite-code re-join)

**File:** `src/actions/members.ts:87-91`
**Issue:** `admin.from('trip_members').upsert({ ..., role: 'member' }, { onConflict: 'trip_id,user_id' })`
generates `INSERT ... ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role, joined_at = EXCLUDED.joined_at`.
When a user who already holds the `admin` role for a trip re-submits a valid invite code (e.g. the
trip owner accidentally types their own code again, or visits `/join/TEST-AB12` via a shared URL),
their row is updated and `role` is overwritten to `'member'`. The service-role client bypasses RLS,
so no policy blocks this. There is no "already a member" short-circuit before the upsert.

In Phase 1, the only admin is the seed user, so the practical impact is limited to the test trip.
But the pattern is copied into every future trip created in Phase 2, where a real admin could lose
their role through normal app use (e.g. sharing the join link with the group and accidentally
following it themselves).

**Fix:** Add `ignoreDuplicates: true` so a conflict is a no-op instead of an overwrite. This is
safe because possession of a valid code is the invite capability — joining twice does not grant
additional privilege and the existing role should be preserved.

```typescript
const { error: upsertErr } = await admin
  .from('trip_members')
  .upsert(
    { trip_id: resolvedTripId, user_id: userId, role: 'member' },
    { onConflict: 'trip_id,user_id', ignoreDuplicates: true }
  )
```

If the intent is to allow role changes via this path in the future, use a partial update instead:
`INSERT ... ON CONFLICT DO UPDATE SET joined_at = now()` (preserving role), achievable by only
setting non-role columns in the update. For v1, `ignoreDuplicates: true` is the correct fix.

---

## Warnings

### WR-01: `getUser()` error silently swallowed — network failure treated as "no session"

**Status:** RESOLVED — commit `22d9a05` (fix(01): WR-01 distinguish getUser() error from genuine no-session)

**File:** `src/actions/members.ts:46`
**Issue:** The destructuring `const { data: { user: existingUser } } = await supabase.auth.getUser()`
discards the `error` field entirely. If `getUser()` fails due to a transient network error or JWT
validation failure, `existingUser` is `null`, and the code falls through to `signInAnonymously()`.
This means a user with an existing (valid) session can be silently re-signed-in as a new anonymous
user on a bad network request, discarding their existing identity without any error surface.

**Fix:** Destructure and check the error:

```typescript
const { data: { user: existingUser }, error: getUserErr } = await supabase.auth.getUser()

if (getUserErr && getUserErr.status !== 0) {
  // Non-zero status means the server responded with a real auth error, not a network timeout.
  // Return generic error rather than creating a spurious anonymous account.
  return { tripId: null, error: es.errors.genericNetwork }
}
```

Note: Supabase returns `{ data: { user: null }, error: null }` for an unauthenticated user (no
session), so the current `if (!existingUser)` branch is still needed. The fix adds a guard for the
case where `getUser()` itself errors.

---

### WR-02: Backfill formula generates invalid `CODE_RE` codes for short trip names

**Status:** DEFERRED — Phase 1 seed trip is not affected (name has 14 non-space chars). Fix belongs in Phase 2 trip-creation code-gen where the generation logic will be implemented fresh. TODO(Phase 2): either pad prefix to min 2 chars or enforce minimum trip name length.

**File:** `supabase/migrations/20260530000006_invite_code.sql:39`
**Issue:** The backfill formula is:
```sql
upper(substr(replace(name, ' ', ''), 1, 4)) || '-' || upper(substr(md5(id::text), 1, 4))
```
For a trip whose name has fewer than 2 non-space characters (e.g. `"A"` → prefix `'A'`), the
generated invite code is `'A-XXXX'`. The prefix `'A'` is 1 character, which fails `CODE_RE`
(`/^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/` requires 2–8 prefix chars). The DB stores the code
without issue (no `CHECK` constraint matching `CODE_RE`), but `InviteCodeForm` will reject any
attempt to type or paste it. The trip becomes permanently unjoinable via the code-entry flow.

Phase 1 has only the seed trip (`name = 'Viaje de Prueba'`, 14 non-space chars) so this is not
triggered today. Phase 2 trip creation will need to generate codes; if the trip name is very short,
the same formula would produce an unusable code.

**Fix:** In the backfill (and in the Phase 2 trip-creation code), pad the prefix to a minimum of 2
characters or enforce a minimum trip name length, or use a fixed-length random prefix that always
satisfies `CODE_RE`:

```sql
-- Pad prefix to at least 2 characters using 'X' as filler if needed
upper(
  lpad(substr(replace(name, ' ', ''), 1, 4), 2, 'X')
) || '-' || upper(substr(md5(id::text), 1, 4))
```

Alternatively, enforce `CHECK (length(replace(name, ' ', '')) >= 2)` on `trips.name` so the
backfill invariant is guaranteed by the schema.

---

### WR-03: Sign-out dialog body tells anonymous users to "re-enter via email" (email is not v1)

**Status:** RESOLVED — commit `abed47e` (fix(01): WR-03 reword sign-out dialog to reference invite code not email)

**File:** `src/i18n/es.ts:50`
**Issue:** `signOutDialogBody: 'Tendrás que volver a ingresar con tu correo.'`
In v1, all users are anonymous; there is no email-based re-entry. An anonymous user who signs out
sees this dialog, is told they need their email to get back in, signs out, and then discovers the
welcome screen asks for an invite code — not an email. This is confusing and slightly misleading
about how the app works.

**Fix:** Update the copy to match the v1 entry model:

```typescript
signOutDialogBody: 'Tendrás que volver a ingresar con tu código de invitación.',
```

---

### WR-04: Route handler applies only a length guard, not `CODE_RE` — malformed codes reach the DB

**Status:** RESOLVED — commit `0f0fa0b` (fix(01): WR-04 validate CODE_RE format before signInAnonymously in route handler)

**File:** `src/app/join/[code]/route.ts:24`
**Issue:** The handler checks `decoded.length > 32` but does not apply `CODE_RE` (or
`isWellFormedInviteCode`) before passing the code to `joinTripByCode`. A request like
`GET /join/hello` (5 chars, no dash, fails `CODE_RE`) bypasses the format guard, makes a full
`signInAnonymously()` call, then fires the `get_trip_id_by_invite_code` RPC. The RPC safely returns
`null` and the caller correctly redirects with `invalidJoinToken`, so there is no security breach.
However, the extra anonymous sign-in is an unnecessary side-effect: a spurious anonymous user is
created in `auth.users` for every malformed URL hit, polluting the user table and triggering a
profile-creation trigger (if one exists).

The form-side validation prevents this in normal use, but the `/join/[code]` URL is also a public
URL-fallback path (mentioned in the UAT script) that can be accessed directly.

**Fix:** Import and apply `isWellFormedInviteCode` before calling `joinTripByCode`:

```typescript
import { isWellFormedInviteCode } from '@/lib/utils/invite-code'

// After the length guard:
if (!isWellFormedInviteCode(decoded)) {
  return NextResponse.redirect(
    `${origin}/?error=${encodeURIComponent(es.errors.invalidJoinToken)}`
  )
}
```

---

## Info

### IN-01: `es.errors.invalidJoinToken` message says "link" — should say "código"

**Status:** RESOLVED — commit `26b21cc` (fix(01): IN-01 reword invalidJoinToken error to say código not link)

**File:** `src/i18n/es.ts:76`
**Issue:** The error string reads: `'Este link de invitación no es válido. Pide uno nuevo a quien
te invitó.'` The entry model is now a typed code, not a link. Showing "link de invitación" when the
user typed a code is jarring and may cause confusion ("I didn't use a link…").

**Fix:**
```typescript
invalidJoinToken: 'Este código de invitación no es válido. Pide el código correcto a quien te invitó.',
```

---

### IN-02: `get_trip_id_by_invite_code` return type in `database.ts` typed as non-nullable `string`

**Status:** RESOLVED — commit `d9a0707` (fix(01): IN-02 correct get_trip_id_by_invite_code return type to string | null)

**File:** `src/types/database.ts:248`
**Issue:** The generated type `{ Args: { lookup_code: string }; Returns: string }` says the RPC
always returns a non-null `string`. The actual SQL function returns `uuid` (nullable — it returns
`NULL` on no-match). At runtime, `data` from `.rpc('get_trip_id_by_invite_code', ...)` will be
`null` when no trip matches, and the caller correctly guards with `if (tripErr || !resolvedTripId)`.
However, TypeScript's view is that `resolvedTripId` is always truthy, so the `!resolvedTripId`
branch looks like dead code to the type system. A future refactor could delete that guard believing
it unreachable.

**Fix:** Correct the generated type to match the actual SQL semantics:
```typescript
get_trip_id_by_invite_code: { Args: { lookup_code: string }; Returns: string | null }
```
This is a manual edit to the generated file; re-running `supabase gen types typescript` will
regenerate the incorrect type until Supabase's CLI inference handles nullable function returns
correctly. Add a comment noting the manual override.

---

### IN-03: No rate-limiting on `/join/[code]` route — invite-code space is enumerable over time

**Status:** DEFERRED — planned for Phase 5. WR-04 fix (CODE_RE guard) removes the spurious anon-user side-effect for malformed codes, marginally reducing the attack surface. Full rate-limiting (Upstash/middleware) is Phase 5 work.

**File:** `src/app/join/[code]/route.ts` (entire file)
**Issue:** The route handler has no rate-limiting. Short hybrid codes (e.g. `MARR-4F9K`) have a
much smaller space than the retired UUID tokens (~1.7 billion combinations vs. 2^128). An automated
attacker making sustained requests could enumerate valid codes over time, gaining access to trips
containing PII (ticket names, booking codes, QR codes per CLAUDE.md privacy constraint).

This is a known gap per the project's STATE.md and planned for Phase 5. Documenting it here as
Info to confirm it was not accidentally made worse: the retired UUID token path was not guessable
in practice; the new code path is enumerable given sufficient time and no throttling.

**Fix (Phase 5):** Add IP-based rate limiting at the Vercel/middleware layer (e.g. `@upstash/ratelimit` with a Redis store on Upstash free tier) or rely on Supabase Auth's built-in anonymous sign-in rate limiting as a partial throttle (Supabase limits anonymous sign-ins per IP by default). Verify the Supabase anonymous sign-in rate limit is enabled before Phase 5 UAT.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
