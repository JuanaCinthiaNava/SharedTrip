---
phase: 02-trip-member-management
plan: 04
subsystem: members/actions+ui
tags: [remove-member, leave-trip, alert-dialog, rls, server-actions, destructive-actions, wave-3]
dependency_graph:
  requires:
    - "02-01: es.members.{removeCta, removeDialogHeading, removeDialogConfirm, leaveCta, leaveDialogHeading, leaveDialogConfirm, cancel} strings"
    - "02-03: MemberRow actionSlot + MemberList with tripId/tripName props; gente/page.tsx with creatorId/currentUserId wiring"
  provides:
    - removeMember(tripId, targetUserId) server action — plain RLS, admin-remove
    - leaveTrip(tripId) server action — plain RLS, self-leave
    - MemberRow inline Quitar/Salir AlertDialog actions (D-11/D-12/D-15)
  affects:
    - "02-05: deleteTrip (creator exit — D-15) — no change needed to MemberRow; creator's own row already shows no action"
tech_stack:
  added: []
  patterns:
    - Plain SSR client DELETE under RLS (no service-role bypass)
    - AlertDialog (base-ui) confirm gate before destructive mutation
    - router.refresh() after remove; router.push('/') after self-leave (D-13 bounce)
    - revalidatePath('/t/[tripId]/gente', 'page') in server actions for RSC cache bust
key_files:
  created: []
  modified:
    - src/actions/members.ts (added removeMember + leaveTrip exports)
    - src/components/members/MemberRow.tsx (inline AlertDialog actions replacing empty actionSlot)
    - src/components/members/MemberList.tsx (passes tripId, tripName, creatorId, currentUserId to MemberRow)
decisions:
  - "Inline action rendered inside MemberRow (not injected via actionSlot) — MemberRow already has isCreator/isCurrentUser; adding creatorId+tripId props keeps the logic co-located with the conditional, avoids prop-threading through MemberList into actionSlot"
  - "AlertDialogTrigger uses className text-destructive text affordance (not a solid Button) per UI-SPEC §4 — visual weight matches the de-emphasized-but-accessible pattern for destructive row actions"
  - "leaveTrip uses router.push('/') post-success (D-13 bounce); removeMember uses router.refresh() (removes the row for the creator)"
  - "pending state on MemberRow disables the trigger during in-flight action (prevents double-submit)"
metrics:
  duration: 10m
  completed: "2026-06-05"
  tasks: 2
  files: 3
---

# Phase 02 Plan 04: Inline remove/leave member actions (D-11, D-12, D-15)

**One-liner:** removeMember + leaveTrip server actions under normal RLS, wired into MemberRow as AlertDialog-guarded destructive affordances — creator removes others (Quitar), non-creator members leave themselves (Salir del viaje), creator's own row has no action (D-15).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | removeMember + leaveTrip Server Actions (TRIP-06, TRIP-07) | e10c538 | src/actions/members.ts |
| 2 | Inline remove/leave actions + AlertDialog confirms in MemberRow (D-11, D-12, D-15) | 9c1470b | src/components/members/MemberRow.tsx, src/components/members/MemberList.tsx |

## Verification Results

- `npx tsc --noEmit`: exits 0
- `npm run build`: exits 0 (all 10 routes generated, /t/[tripId]/gente dynamic)
- `grep -nE "export async function (leaveTrip|removeMember)" src/actions/members.ts`: PASS (lines 121, 155)
- `grep -A30 "leaveTrip" src/actions/members.ts | grep -c SUPABASE_SECRET_KEY` → 0: PASS (no service-role)
- `grep -n "AlertDialog" src/components/members/MemberRow.tsx`: PASS (AlertDialog imported + used)
- `grep -nE "removeMember\(|leaveTrip\(" src/components/members/MemberRow.tsx`: PASS (both calls present)
- Creator own-row guard: `showRemove = viewerIsCreator && !isOwnRow` — own row excluded: PASS
- Destructive affordances use `text-destructive`: PASS
- `router.refresh()` after removeMember: PASS
- `router.push('/')` after leaveTrip: PASS

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — MemberRow.actionSlot stub from 02-03 is now filled with real inline actions. The `actionSlot` prop is retained for backwards compatibility but only renders if neither `showRemove` nor `showLeave` is true.

## Threat Flags

None — all surfaces match the plan's threat model:
- T-02-11 (elevation of privilege): mitigated — plain SSR client under DELETE RLS; admin-remove policy enforces creator-only; a non-creator calling removeMember is denied at DB
- T-02-12 (spoofing): mitigated — actor derived from server getUser(); targetUserId is only a row scope key
- T-02-13 (tampering / over-broad delete): mitigated — delete scoped to `.eq('trip_id', tripId).eq('user_id', ...)` under RLS; no service-role
- T-02-14 (removed member lingering): accepted — D-13 bounce via router.push('/') on leaveTrip success; removed member bounced on next navigation by layout null-trip guard

## Self-Check: PASSED

All files confirmed present. Both task commits confirmed in git history.
- src/actions/members.ts — FOUND (leaveTrip + removeMember both exported)
- src/components/members/MemberRow.tsx — FOUND (AlertDialog, removeMember, leaveTrip present)
- src/components/members/MemberList.tsx — FOUND (tripId, tripName, creatorId, currentUserId passed)
- Commits: e10c538, 9c1470b — both FOUND
