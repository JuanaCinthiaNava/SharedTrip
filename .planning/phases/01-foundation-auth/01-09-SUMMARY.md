---
phase: 01-foundation-auth
plan: 09
subsystem: auth
tags: [supabase, anonymous-auth, react-hook-form, zod, next.js, invite-code, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-auth plan 01-08
    provides: trips.invite_code column + get_trip_id_by_invite_code RPC + seed code TEST-AB12

provides:
  - joinTripByCode server action (code -> anon sign-in -> RPC resolve -> service-role member insert)
  - /join/[code] GET route handler (code-in-URL fallback)
  - InviteCodeForm client component (RHF + Zod, blur + submit validation, navigates to /join/{CODE})
  - Welcome page rewritten to typed-code entry (es.entry.* dictionary)
  - Magic-link path fully removed (sendMagicLink, MagicLinkForm, /auth/callback, /auth/check-email deleted)
  - SinCuentaPill made static non-interactive indicator (D-11 retained, store wiring stripped)
  - AnonymousBanner render removed from trip layout (D-12 deferred to Phase 6)

affects:
  - Phase 6 (email/accounts): AnonymousUpgradeSheet + AnonymousBanner files retained on disk for Phase 6 re-wiring
  - Phase 2: invite_code generation must produce codes matching CODE_RE /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/

# Tech tracking
tech-stack:
  added: []  # No new packages — reuses react-hook-form, zod, shadcn already present
  patterns:
    - "Code entry via route handler: InviteCodeForm navigates to /join/{CODE} (GET route handler) rather than calling server action directly, because signInAnonymously must write the session cookie in a route handler context"
    - "Single normalization point: client normalizes to uppercase for display; RPC normalizes via upper(trim()) as source of truth; no duplicate normalization in the action"
    - "CODE_RE /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/ for hybrid invite-code format validation (client-side UX only; DB resolver is the existence authority)"

key-files:
  created:
    - src/components/auth/InviteCodeForm.tsx
    - src/app/join/[code]/route.ts
  modified:
    - src/actions/members.ts
    - src/app/page.tsx
    - src/i18n/es.ts
    - src/actions/auth.ts
    - src/components/layout/TopHeader.tsx
    - src/components/common/SinCuentaPill.tsx
    - src/app/t/[tripId]/layout.tsx
  deleted:
    - src/components/auth/MagicLinkForm.tsx
    - src/app/auth/callback/route.ts
    - src/app/auth/check-email/page.tsx
    - src/app/join/[token]/route.ts

key-decisions:
  - "uuid /join/[token] route retired; /join/[code] replaces it — code-in-URL fallback kept at near-zero cost; dead uuid path removed"
  - "Magic-link fully removed from v1 critical path — sendMagicLink, MagicLinkForm, /auth/callback, /auth/check-email deleted; signOut retained"
  - "D-12 email-upgrade banner deferred to Phase 6 — AnonymousBanner render removed from trip layout; AnonymousUpgradeSheet wiring removed from TopHeader; component files retained on disk for Phase 6"
  - "D-11 SinCuentaPill made static non-interactive indicator — useBannerStore/openUpgradeSheet wiring stripped; <button> replaced with <span>; no orphaned store call for Phase 6 implementer"
  - "CODE_RE /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/ adopted for client-side format hint; DB resolver is the trip-existence authority"

patterns-established:
  - "Anonymous join always through route handler — cookie-write boundary requires GET route, not page render"
  - "Service-role upsert (trip_members, onConflict: trip_id,user_id) unchanged from [[anon-join-architecture]] — all 4 coordinated fixes preserved verbatim"

requirements-completed:
  - AUTH-05

# Metrics
duration: continuation agent (tasks 1-3 executed in prior session; continuation for summary + state update)
completed: 2026-06-03
---

# Phase 01, Plan 09: Invite-Code Entry Slice Summary

**Typed-code entry replaces magic-link on the welcome screen: InviteCodeForm + joinTripByCode server action + /join/[code] route shipped; magic-link (sendMagicLink, MagicLinkForm, /auth/callback, /auth/check-email) deleted; D-11 pill made static, D-12 banner deferred to Phase 6**

## Performance

- **Duration:** Tasks 1-3 executed in prior session; continuation agent finalized state
- **Started:** 2026-06-03T00:00:00Z (prior session)
- **Completed:** 2026-06-03
- **Tasks:** 3 automated tasks complete + 1 checkpoint deferred (see below)
- **Files modified:** 8 modified, 2 created, 4 deleted

## Accomplishments

- `joinTripByCode(code)` server action ships: anonymous sign-in (if needed) -> `get_trip_id_by_invite_code` RPC -> service-role `trip_members` upsert with `onConflict: 'trip_id,user_id'` — the [[anon-join-architecture]] insert is unchanged byte-for-byte
- Welcome screen (`/`) is now a typed invite-code entry form (`InviteCodeForm`) with RHF + Zod validation, blur-and-submit mode, Spanish copy via `es.entry.*`, and a loading spinner during navigation
- All magic-link code removed from v1: `sendMagicLink`, `MagicLinkForm.tsx`, `/auth/callback/route.ts`, `/auth/check-email/page.tsx` deleted; `signOut` retained; `npm run build` + `tsc --noEmit` exit 0 with no dangling imports
- Email-upgrade banner (`AnonymousBanner`) unrendered from trip layout; `AnonymousUpgradeSheet` wiring removed from `TopHeader`; `SinCuentaPill` changed from `<button onClick=openUpgradeSheet>` to a static `<span>` indicator — no orphaned Zustand wiring, both Phase 6 files retained on disk
- `es.entry.*` namespace added to `es.ts` (heading, subheading, codeLabel, codePlaceholder, submitCta, invalidFormat); `es.auth.*` keys left intact (unused, acceptable)
- `/join/[code]` GET route handler delivers code-in-URL fallback (mirrors retired `/join/[token]` handler pattern)

## Task Commits

1. **Task 1: joinTripByCode + /join/[code] route + es.entry + retire uuid route** - `e210d1b` (feat)
2. **Task 2: InviteCodeForm + welcome page swap + remove all magic-link code** - `94e7e5d` (feat)
3. **Task 3: Gate D-12 banner + make SinCuentaPill a static indicator** - `5082d90` (feat)
4. **Task 4: checkpoint:human-verify** - DEFERRED (see below)

**Plan metadata commit:** TBD (this summary)

## Files Created/Modified

### Created
- `src/components/auth/InviteCodeForm.tsx` - RHF + Zod invite-code entry form; 'use client'; navigates to `/join/{CODE}` via `router.push`
- `src/app/join/[code]/route.ts` - GET route handler; calls `joinTripByCode`; redirects to `/t/{tripId}/docs` on success, `/?error=...` on failure

### Modified
- `src/actions/members.ts` - Added `joinTripByCode(code)`; resolves via `get_trip_id_by_invite_code` RPC; service-role upsert unchanged; removed old `joinTrip(token)`
- `src/app/page.tsx` - Swapped `MagicLinkForm` for `InviteCodeForm`; heading/subheading now use `es.entry.*`
- `src/i18n/es.ts` - Added `entry:` namespace (heading, subheading, codeLabel, codePlaceholder, submitCta, invalidFormat)
- `src/actions/auth.ts` - Removed `sendMagicLink`; `signOut` retained intact
- `src/components/layout/TopHeader.tsx` - Removed `AnonymousUpgradeSheet` render + `useBannerStore` wiring; `SinCuentaPill` retained; comment: email-upgrade sheet deferred to Phase 6
- `src/components/common/SinCuentaPill.tsx` - Removed `useBannerStore` import + `openUpgradeSheet` call; `<button>` replaced with `<span>`; comment: Phase 6 will re-wire to upgrade sheet
- `src/app/t/[tripId]/layout.tsx` - Removed `{user.is_anonymous && <AnonymousBanner />}` render + import; comment: deferred to Phase 6

### Deleted
- `src/components/auth/MagicLinkForm.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/auth/check-email/page.tsx`
- `src/app/join/[token]/route.ts` (uuid path — replaced by `/join/[code]`)

## Decisions Made

- **`joinTripByCode` preserves service-role insert verbatim:** Steps 1 (getUser -> signInAnonymously, userId server-side) and 3 (service-role upsert, onConflict 'trip_id,user_id') are byte-for-byte from the [[anon-join-architecture]]. Only step 2 changes (RPC call `get_trip_id_by_invite_code` vs `get_trip_id_by_invite_token`).
- **CODE_RE used:** `/^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/` — permissive enough to accept `TEST-AB12` and real generated codes; strict enough to reject obvious garbage like `hello`; case-insensitive via Zod `.trim()` + uppercase in the route.
- **Single normalization point:** raw code passed to RPC (which runs `upper(trim())` internally); client normalizes to uppercase before `router.push` as a cosmetic hint only.
- **Magic-link `es.auth.*` keys left in `es.ts`:** pruning unused dictionary keys was intentionally deferred — no behavior impact, no dangling references in components.

## Checkpoint: DEFERRED (Auto-approved in YOLO Mode — NOT Tested)

**Task 4 (checkpoint:human-verify) status: DEFERRED — auto-approved to close plan, actual test NOT performed.**

The following steps have NOT been executed and must be completed before AUTH-05 can be declared fully verified:

### Required: Deploy to Production
```bash
vercel --prod --force
```
(Production does NOT auto-deploy on push — see project memory `vercel-deploy-workflow.md`.)

### Required: 8-Step iPhone UAT (AUTH-05 Re-scoped)

On a real iPhone in Safari with all SharedTrip cookies + site data cleared:

1. **Typed-code happy path** — Open `https://{vercel-domain}/`. Confirm welcome screen shows the `es.entry` heading/subheading and an invite-CODE input (NOT email field) with "Entrar al viaje" button. Type `test-ab12` (lowercase, with optional trailing space). Tap "Entrar al viaje". Expected: lands at `/t/11111111-.../docs` within ~2s with no email, no login, no upgrade banner. Top header shows "Viaje de Prueba (Phase 1)"; right side shows mango "Sin cuenta" pill. No email-upgrade banner below header (D-12 deferred).

2. **DB membership check** — In Supabase Dashboard -> SQL Editor:
   ```sql
   SELECT user_id, role FROM public.trip_members
   WHERE trip_id='11111111-1111-1111-1111-111111111111'
   ORDER BY joined_at DESC LIMIT 5;
   ```
   Expected: new row with anonymous `user_id` and `role='member'`.

3. **Pill is inert** — Tap the "Sin cuenta" pill. Expected: nothing opens (no email-upgrade sheet, no state change).

4. **Session persists (AUTH-03)** — Force-quit Safari, reopen, navigate to `/t/11111111-.../docs`. Expected: still inside trip (not bounced to `/`).

5. **Sign out (AUTH-04)** — Go to Perfil -> Cerrar sesión -> confirm. Expected: returns to `/` (the code-entry welcome screen).

6. **Unknown code error path** — From `/`, type `NOPE-9999`. Tap submit. Expected: redirected back to `/` with Spanish toast "Este link de invitación no es válido…" (`es.errors.invalidJoinToken`). No membership created.

7. **Malformed code inline validation** — From `/`, type `hello` (no hyphen). Tap submit. Expected: inline Spanish format error (`es.entry.invalidFormat`) under the field; no navigation, no network call.

8. **Code-in-URL fallback** — Sign out, navigate directly to `https://{vercel-domain}/join/test-ab12`. Expected: same as step 1c — anon join + land in trip.

### Disposition
AUTH-05 code implementation is complete (committed, build passes, tsc passes, 50/50 tests pass). Real-device confirmation is pending the steps above. These are tracked for HUMAN-UAT.md.

## Deviations from Plan

None on the code tasks — all three automated tasks executed exactly as planned.

The human-verify checkpoint (Task 4) was auto-approved by the YOLO-mode orchestrator to unblock plan finalization. The actual `vercel --prod --force` deploy and 8-step iPhone test were NOT performed. This is documented as a DEFERRED human action (not a pass).

## Issues Encountered

None during automated tasks. `npm run build` and `tsc --noEmit` both exit 0. 50/50 tests pass. No dangling imports found after magic-link deletion.

## Known Stubs

None — the invite-code form wires to the live `joinTripByCode` server action and the live Supabase RPC. No placeholder data flows to the UI.

## Threat Flags

No new security surface introduced beyond what the plan's `<threat_model>` covers. Key mitigations in place:
- `>32 char` length guard on `/join/[code]` route handler (T-01-09-03)
- `ErrorToast` renders only `KNOWN_ERRORS` set (T-01-09-04)
- `userId` always from server-side session, never client input (T-01-09-02)

## Next Phase Readiness

- Phase 1 automated code is complete. Real-device UAT (AUTH-05 re-scoped, AUTH-03, AUTH-04) and prod deploy pending before Phase 1 can be declared fully done.
- Phase 2 (Trip + Member Management) can be planned and the invite_code generation logic must emit codes matching `CODE_RE /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/` to be accepted by `InviteCodeForm`.
- Phase 6 can re-wire `AnonymousUpgradeSheet` and `AnonymousBanner` (files intact on disk); `SinCuentaPill` needs its `<span>` changed back to `<button onClick=openUpgradeSheet>` and `useBannerStore` re-imported.

---
*Phase: 01-foundation-auth*
*Plan: 09*
*Completed: 2026-06-03 (code complete; real-device UAT deferred)*
