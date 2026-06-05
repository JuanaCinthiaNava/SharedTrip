---
status: partial
phase: 02-trip-member-management
source: [02-VERIFICATION.md]
started: 2026-06-05T20:45:00Z
updated: 2026-06-05T20:45:00Z
---

## Current Test

[awaiting human testing — run on a real device or Vercel preview over HTTPS]

## Tests

### 1. Trip dates render on screen in es-MX format (SC5 / UI-05)
expected: On a trip with dates set, the Gente page trip header shows the range via `formatTripRange` (e.g. "5–12 de jun de 2026"); a trip with no dates shows no date row. (Code resolved — commit 48e7ed9; visual confirmation only.)
result: [pending]

### 2. Anonymous trip creation works end-to-end on a fresh device
expected: A user with no prior session opens `/`, taps "Crear viaje", fills a trip name (dates/description optional), and lands inside `/t/[id]/gente` as the trip admin with a generated invite code visible on the InviteCard.
result: [pending]

### 3. Clipboard copy of invitation produces the correct message
expected: Tapping "Copiar invitación" on the InviteCard shows a "Copiado" toast and copies a message containing the `/join/[code]` deep-link AND the bare code.
result: [pending]

### 4. Edit trip changes are visible to another member on next navigation
expected: Creator edits the trip name (EditTripSheet); another member in a different session navigates to the Gente tab and sees the new name/dates without a hard reload (revalidatePath + router.refresh).
result: [pending]

### 5. Creator removes a member; member can leave; removed/left member is bounced
expected: Creator taps "Quitar" on another member's row and confirms → row disappears. A non-creator taps "Salir del viaje" and confirms → returns to `/`. A removed/left member navigating to any `/t/[tripId]/*` route is redirected to `/` by the layout null-trip guard. The creator has no "Salir" (delete is their only exit).
result: [pending]

### 6. Delete trip requires typing the exact name
expected: Creator opens the delete dialog; the destructive "Eliminar viaje" button stays disabled until the exact trip name is typed; confirming deletes the trip (cascade) and returns to `/`.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
