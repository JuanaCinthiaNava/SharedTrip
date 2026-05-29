---
phase: 01-foundation-auth
plan: "02"
subsystem: database
tags: [supabase, postgresql, rls, migrations, typescript, storage, auth]
dependency_graph:
  requires: [01-01]
  provides: [database-schema, typescript-types, storage-bucket, auth-config]
  affects: [01-03, 01-04, 01-05]
tech_stack:
  added: []
  patterns: [security-definer-rls, rls-in-creation-migration, (SELECT auth.uid()) optimization]
key_files:
  created:
    - supabase/migrations/20260530000001_initial_schema.sql
    - supabase/migrations/20260530000002_storage_bucket_rls.sql
    - supabase/migrations/20260530000003_profile_autocreate_trigger.sql
    - supabase/migrations/20260530000004_phase1_seed_test_trip.sql
    - src/types/database.ts
    - .github/workflows/keep-alive.yml
  modified:
    - .gitignore
decisions:
  - "Tables created first, then is_trip_member() function, then all policies — PostgreSQL requires the table to exist when the function body references it"
  - "is_trip_member() uses SECURITY DEFINER + SET search_path = public to prevent schema injection and enable cross-table RLS without recursion"
  - "All RLS policies use (SELECT auth.uid()) not bare auth.uid() for performance (prevents per-row re-evaluation)"
  - "Storage bucket created via REST API rather than dashboard (automated, repeatable)"
  - "Anonymous sign-ins enabled + OTP expiry set to 900s via Management API"
metrics:
  duration: "~30 minutes (resumed from checkpoint)"
  completed_date: "2026-05-29"
---

# Phase 01 Plan 02: Database Schema + RLS + Storage + Auth Config Summary

PostgreSQL schema with 6 tables, SECURITY DEFINER RLS via `is_trip_member()`, private storage bucket, and anonymous sign-ins enabled — all applied to live Supabase project with TypeScript types generated.

## What Was Built

### Database Schema (Migration 01)
All 6 tables applied to Supabase, with RLS enabled in the same migration (never split):
- `public.profiles` — user profiles (display_name, avatar_seed); auto-created by trigger
- `public.trips` — trip hub (name, description, dates, created_by, invite_token)
- `public.trip_members` — membership join table (trip_id, user_id, role)
- `public.documents` — uploaded files metadata (file_path, file_type, category)
- `public.itinerary_items` — trip schedule (title, location, start/end times)
- `public.expenses` — expense tracking (amount, currency, paid_by, split_between)

`is_trip_member(check_trip_id uuid)` SECURITY DEFINER function: single membership check reused by all per-trip policies.

### RLS Policies (17 total)
- profiles: 3 (SELECT co-members, UPDATE self, INSERT self)
- trips: 4 (SELECT members, UPDATE creator, DELETE creator, INSERT authenticated)
- trip_members: 3 (SELECT members, INSERT self-join, DELETE admin-or-self)
- documents: 3 (SELECT members, INSERT uploader+member, DELETE uploader-or-admin)
- itinerary_items: 2 (SELECT members, ALL members)
- expenses: 2 (SELECT members, INSERT members)

### Storage (Migration 02)
3 policies on `storage.objects` for the `trip-documents` bucket:
- SELECT: `is_trip_member((storage.foldername(name))[1]::uuid)`
- INSERT: same condition via WITH CHECK
- DELETE: owner = (SELECT auth.uid())

### Profile Autocreate Trigger (Migration 03)
`handle_new_user()` SECURITY DEFINER trigger fires on `auth.users` INSERT — creates a `profiles` row with NULL display_name. Covers both permanent users and anonymous users created by `signInAnonymously()`.

### Seed Data (Migration 04)
Test trip for Plan 04 anonymous-join validation:
- Trip ID: `11111111-1111-1111-1111-111111111111`
- Invite token: `22222222-2222-2222-2222-222222222222`
- Admin seed user: `00000000-0000-0000-0000-000000000001` (phase1-test@sharedtrip.invalid)

Plan 04 validates `/join/22222222-2222-2222-2222-222222222222` against this row.

### TypeScript Types
`src/types/database.ts` generated from live schema. Exports `Database` interface with all 6 tables (Row/Insert/Update types). Consumed by Supabase client factories in Plan 03:
```typescript
import { Database } from '@/types/database'
// Database['public']['Tables']['trips']['Row'] — fully typed
```

### Storage Bucket
`trip-documents` bucket: private (`public: false`), 10 MB file size limit, created via REST API.

### Auth Configuration
- Anonymous sign-ins: **enabled** (required for Plan 04 join flow without account)
- OTP/Magic Link expiry: **900 seconds** (15 minutes, down from default 3600s)

### GitHub Actions Keep-Alive
`.github/workflows/keep-alive.yml` — cron `*/5 * * * *` pings Supabase REST to prevent free-tier pause. Includes `workflow_dispatch` for manual smoke-testing.

**Note:** Push to GitHub is pending `workflow` scope on gh OAuth. The workflow file is committed locally (commit `4e6c3d2`) but requires user to run `gh auth refresh -h github.com -s workflow` to unblock the push.

## Verification Results

| Check | Result |
|-------|--------|
| RLS blocks anon on trips | PASS — `[]` returned |
| All 4 migrations applied | PASS — all Local=Remote in migration list |
| All 6 tables have rowsecurity=true | PASS — confirmed via Management API |
| Seed trip + invite_token exists | PASS — confirmed via service role query |
| Storage bucket trip-documents | PASS — private, 10MB limit |
| Anonymous sign-ins enabled | PASS — confirmed via Management API |
| OTP expiry = 900s | PASS — confirmed via Management API |
| src/types/database.ts generated | PASS — exports Database interface with 6 tables |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reordered migration 01 — is_trip_member() before trip_members table**
- **Found during:** Task 2, first push attempt
- **Issue:** Migration author placed the `is_trip_member()` function before the `public.trip_members` table. PostgreSQL `LANGUAGE sql` functions parse the body at creation time and fail with `ERROR: relation "public.trip_members" does not exist`.
- **Fix:** Restructured migration 01 to: (1) CREATE all 6 tables + ENABLE RLS, (2) CREATE is_trip_member() function (after trip_members exists), (3) CREATE all policies (policies reference the function safely as stored SQL text, validated at query time).
- **Files modified:** `supabase/migrations/20260530000001_initial_schema.sql`
- **Commit:** `96a7271`

### Pending Items

**GitHub push blocked by OAuth scope:** The keep-alive workflow file (`.github/workflows/keep-alive.yml`, commit `4e6c3d2`) is committed locally but cannot be pushed until the gh OAuth token has the `workflow` scope. User must run in their terminal:
```bash
gh auth refresh -h github.com -s workflow
git push origin main
```
After push, trigger a manual run to verify: `gh workflow run keep-alive.yml`

## Known Stubs

None — all schema is wired to live Supabase project.

## Threat Flags

No new threat surface beyond what was documented in the plan's threat model.
