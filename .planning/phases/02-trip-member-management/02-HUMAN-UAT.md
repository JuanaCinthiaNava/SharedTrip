---
status: complete
phase: 02-trip-member-management
source: [02-VERIFICATION.md]
started: 2026-06-05T20:45:00Z
updated: 2026-06-12T12:45:00Z
---

## Current Test

[testing complete]

<!--
Re-test run started 2026-06-12. The prior run (same day) marked all 6 tests blocked:
Phase 02 code was committed locally but unpushed (origin/main frozen at 32ee7a5,
2026-06-01) so prod ran pre-Phase-02 code. Resolved by pushing 57 commits + redeploying
prod (vercel --prod --force, dpl_3nEnLTBJ8nf8R9ZYLhnWnH3YpQpp). 3 untracked magic-link
zombie files were deleted to fix the build. Now re-testing against deployed code.
-->

## Tests

### 1. Trip dates render on screen in es-MX format (SC5 / UI-05)
expected: On a trip with dates set, the Gente page trip header shows the range via `formatTripRange` (e.g. "5–12 de jun de 2026"); a trip with no dates shows no date row.
result: pass

### 2. Anonymous trip creation works end-to-end on a fresh device
expected: A user with no prior session opens `/`, taps "Crear viaje", fills a trip name (dates/description optional), and lands inside `/t/[id]/gente` as the trip admin with a generated invite code visible on the InviteCard.
result: pass

### 3. Clipboard copy of invitation produces the correct message
expected: Tapping "Copiar invitación" on the InviteCard shows a "Copiado" toast and copies a message containing the `/join/[code]` deep-link AND the bare code.
result: pass

### 4. Edit trip changes are visible to another member on next navigation
expected: Creator edits the trip name (EditTripSheet); another member in a different session navigates to the Gente tab and sees the new name/dates without a hard reload (revalidatePath + router.refresh).
result: pass

### 5. Creator removes a member; member can leave; removed/left member is bounced
expected: Creator taps "Quitar" on another member's row and confirms → row disappears. A non-creator taps "Salir del viaje" and confirms → returns to `/`. A removed/left member navigating to any `/t/[tripId]/*` route is redirected to `/` by the layout null-trip guard. The creator has no "Salir" (delete is their only exit).
result: issue
reported: "no veo ningun miembro aunque alguien ya abrió el link para ver el viaje"
severity: major

### 6. Delete trip requires typing the exact name
expected: Creator opens the delete dialog; the destructive "Eliminar viaje" button stays disabled until the exact trip name is typed; confirming deletes the trip (cascade) and returns to `/`.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "The Gente member list shows every member of the trip, including others who joined via the invite link — not just the current user."
  status: failed
  reason: "User reported: no veo ningún miembro aunque alguien ya abrió el link para ver el viaje. After someone opened the invite link, the creator still sees no member rows. Either the join did not create a trip_members row, or the Gente member-list query (likely RLS) only returns the current user. Blocks the remove-member sub-test (no row to 'Quitar')."
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
