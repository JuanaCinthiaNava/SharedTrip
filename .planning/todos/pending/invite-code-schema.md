---
title: "Schema: hybrid invite_code on trips + seed update + generation on create"
date: 2026-06-01
priority: high
relates_to: phase-01-foundation-auth, phase-02-trip-member-management
---

# Schema — hybrid `invite_code` for trips

See decision note `entry-model-invite-code`. Codes are typed by hand, so the existing `invite_token uuid` is unusable as the entry mechanism (UUIDs aren't typeable). Add a short, human-typeable, unique code.

## Format

Hybrid: short name-prefix + random suffix, e.g. `MARR-4F9K`.
- Prefix: first ~4 letters of the trip name, uppercased, non-alpha stripped.
- Suffix: ~4 random chars from an **unambiguous alphabet** (exclude `0/O`, `1/I/L`) so codes are easy to read/type.
- Treated **case-insensitively** on entry (store normalized, e.g. uppercase).
- **Unique** across trips (regenerate suffix on collision).

## Tasks

- [ ] Migration: add `invite_code text NOT NULL UNIQUE` to `public.trips` (keep or drop `invite_token` — decide; the anonymous-join resolution moves to `invite_code`).
- [ ] Update the SECURITY DEFINER resolver: replace/augment `get_trip_id_by_invite_token(uuid)` with `get_trip_id_by_invite_code(text)` (same SECURITY DEFINER + `SET search_path = public` pattern; normalize case in the lookup). Apply live (SQL Editor / `supabase db push`).
- [ ] Update the seed trip (`20260530000004_phase1_seed_test_trip.sql`) to a typeable code (e.g. `TEST-AB12`) so phase-01 UAT can type it.
- [ ] Regenerate `src/types/database.ts` (or hand-edit the `Functions`/`Row` entries) to reflect the new column + RPC.
- [ ] **Phase 2 (trip creation):** generate `invite_code` server-side on trip create — prefix from name, random unambiguous suffix, retry on unique-violation.

## Notes

- Belongs partly to Phase 01 (entry/seed) and partly to Phase 02 (generation at creation). Sequence: column + resolver + seed first (unblocks phase-01 re-scope), generation when Phase 02 builds trip creation.
- Keep the service-role membership insert from plan 06 unchanged — only the *resolution* input changes (uuid → code).
