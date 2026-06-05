---
phase: 02-trip-member-management
plan: 03
subsystem: members/ui
tags: [member-list, invite-card, clipboard, trip-switcher, rsc, rls, wave-2]
dependency_graph:
  requires:
    - "02-01: invite/members/trip i18n namespaces (es.ts)"
    - "02-02: createTrip + /trips/nueva route (TripSwitcher link target)"
  provides:
    - gente/page.tsx RSC member-list (trip_members JOIN profiles, member-gated RLS)
    - MemberRow (UserAvatar + name + Creador/Tu badges + action slot for 02-04)
    - MemberList (RSC mapper)
    - InviteCard (clipboard copy, deep-link + bare code, sonner toasts)
    - TripSwitcherSheet wired create entry (D-05)
  affects:
    - "02-04: action slot in MemberRow available for Quitar/Salir buttons"
    - "02-05: gente/page.tsx structure already additive for edit/delete affordances"
tech_stack:
  added: []
  patterns:
    - RSC fetch under RLS (trip + trip_members JOIN profiles) — mirrors layout.tsx pattern
    - Nested-relation flatten (Array.isArray guard on profiles tuple)
    - navigator.clipboard.writeText in 'use client' component with sonner toast feedback
    - actionSlot prop pattern for deferred inline actions (02-04 fills)
key_files:
  created:
    - src/app/t/[tripId]/gente/page.tsx (replaced Phase 1 placeholder)
    - src/components/members/MemberList.tsx
    - src/components/members/MemberRow.tsx
    - src/components/members/InviteCard.tsx
  modified:
    - src/components/layout/TripSwitcherSheet.tsx (D-05: disabled button → Link to /trips/nueva)
decisions:
  - "Nested profiles flatten uses Array.isArray guard — Supabase may return array or object for embedded relation; guard handles both shapes without TS errors"
  - "MemberRow is 'use client' (02-04 will add dialog triggers); MemberList stays RSC (pure mapper)"
  - "hasCoMembers condition hides heading/list when sole member — InviteCard is the empty state (D-07)"
  - "actionSlot as React.ReactNode prop — 02-04 injects Quitar/Salir inline without rewriting MemberRow"
  - "TripSwitcherSheet: replaced disabled button with Next.js Link — base-ui has no asChild/Slot pattern"
metrics:
  duration: 8m
  completed: "2026-06-05"
  tasks: 3
  files: 5
---

# Phase 02 Plan 03: Share-and-see — Gente RSC page, MemberList, InviteCard, TripSwitcher wiring

**One-liner:** RLS-gated RSC Gente page with MemberRow avatar+badge rows, clipboard InviteCard carrying deep-link + bare invite code, and wired TripSwitcher create entry — closes the create→share→see loop (TRIP-02 sharing half, TRIP-04, TRIP-05).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace gente/page.tsx with RSC member-list | ecd5c98 | gente/page.tsx |
| 2 | MemberList + MemberRow (D-10, TRIP-05) | 054f07e | MemberList.tsx, MemberRow.tsx |
| 3 | InviteCard clipboard + wire TripSwitcher (D-05/07/08/09) | 37d37cd | InviteCard.tsx, TripSwitcherSheet.tsx |

## Verification Results

- `npx tsc --noEmit`: exits 0
- `npm run build`: exits 0 (7 routes generated, /t/[tripId]/gente dynamic)
- `grep -q "trip_members" gente/page.tsx`: PASS
- `grep -q "InviteCard" gente/page.tsx`: PASS
- `grep -q "created_by" gente/page.tsx`: PASS
- `grep -q "UserAvatar" MemberRow.tsx` with size="md": PASS
- `grep -qE "badgeCreator|badgeYou" MemberRow.tsx`: PASS
- `grep -q "bg-primary/15 text-primary" MemberRow.tsx`: PASS (Creador badge)
- `grep -q "bg-surface text-fg-muted border border-border" MemberRow.tsx`: PASS (Tu badge)
- `grep -q "clipboard.writeText" InviteCard.tsx`: PASS
- `grep -q "shareMessage" InviteCard.tsx`: PASS
- `grep -q "copiedToast" InviteCard.tsx`: PASS
- `grep -q "text-accent" InviteCard.tsx`: PASS (code emphasis)
- `grep -c "disabled" TripSwitcherSheet.tsx` → 0: PASS (create button fully enabled)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added Array.isArray guard on nested profiles relation**
- **Found during:** Task 1 implementation
- **Issue:** Supabase's `.select('user_id, role, profiles(display_name, avatar_seed)')` can return `profiles` as either a single object or an array depending on the join cardinality. Without a guard, TypeScript infers `profiles: { display_name: string | null; avatar_seed: string | null } | { display_name: string | null; avatar_seed: string | null }[]` — accessing `.display_name` directly would be unsafe at runtime if an array is returned.
- **Fix:** Added `Array.isArray(tm.profiles) ? tm.profiles[0] ?? null : (tm.profiles ?? null)` flatten guard in gente/page.tsx, mirroring a defensive pattern for nested relations.
- **Files modified:** src/app/t/[tripId]/gente/page.tsx
- **Commit:** ecd5c98

None of the other tasks required auto-fixes.

## Known Stubs

- `MemberRow.actionSlot` is intentionally empty in this plan — 02-04 (Quitar/Salir) will inject the inline destructive actions. The prop exists and is typed; the slot renders if provided.
- `MemberList` receives `tripId` and `tripName` props that it does not yet use — forwarded for 02-04 to pick up without changing the parent interface.

## Threat Flags

None — all surfaces match the plan's threat model:
- T-02-07 (member-list read): mitigated — RSC reads under member-gated SELECT RLS via plain SSR client (`is_trip_member()`); no service-role client used
- T-02-08 (invite_code in UI): accepted — code shown only to authenticated members on a member-gated page
- T-02-09 (clipboard share message): mitigated — `navigator.clipboard.writeText` requires secure context (HTTPS in prod); message contains only already-known trip code + deep-link, no enumerable ID oracle
- T-02-10 (TripSwitcher create wiring): mitigated — create entry routes to 02-02 flow where identity comes from server session; switcher passes no identity

## Self-Check: PASSED

All 5 files confirmed present. All 3 task commits confirmed in git history.
- src/app/t/[tripId]/gente/page.tsx — FOUND
- src/components/members/MemberList.tsx — FOUND
- src/components/members/MemberRow.tsx — FOUND
- src/components/members/InviteCard.tsx — FOUND
- src/components/layout/TripSwitcherSheet.tsx (modified) — FOUND
- Commits: ecd5c98, 054f07e, 37d37cd — all FOUND
