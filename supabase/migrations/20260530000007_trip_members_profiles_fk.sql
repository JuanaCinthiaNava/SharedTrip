-- migration: 20260530000007_trip_members_profiles_fk.sql
-- Adds the missing foreign key from trip_members.user_id -> profiles.id so PostgREST
-- can resolve the embedded relationship `trip_members.select('..., profiles(...)')`.
--
-- Why this is needed (Phase 02 UAT Test 5 root cause):
-- The Gente member list (src/app/t/[tripId]/gente/page.tsx) queries:
--   from('trip_members').select('user_id, role, profiles(display_name, avatar_seed)')
-- PostgREST resolves the `profiles(...)` embed by walking a foreign-key relationship between
-- the two tables. Until now there was NONE: trip_members.user_id REFERENCES auth.users
-- (initial_schema.sql:45) and profiles.id REFERENCES auth.users (line 18) — both point at
-- auth.users, but there is no direct trip_members -> profiles edge. PostgREST therefore
-- returned error PGRST200 ("Could not find a relationship between 'trip_members' and
-- 'profiles' in the schema cache"), the page discarded the error and fell back to an empty
-- member list, so co-members NEVER rendered for any trip.
--
-- This FK is safe and correct:
-- - profiles.id is 1:1 with auth.users.id (profiles.id REFERENCES auth.users, and the
--   profile-autocreate trigger guarantees a profile row per user).
-- - A pre-migration audit confirmed 0 orphan trip_members rows (every distinct user_id
--   already has a matching profiles row), so the validated constraint will not fail.
-- - trip_members.user_id keeps its existing FK to auth.users; this ADDS a second FK to
--   profiles(id). Both are satisfied by the same value. ON DELETE CASCADE mirrors the
--   existing auth.users FK so member rows are still cleaned up when a user is deleted.
--
-- No RLS policy is added, altered, or relaxed by this migration.

ALTER TABLE public.trip_members
  ADD CONSTRAINT trip_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ask PostgREST to reload its schema cache so the new relationship is picked up immediately
-- (Supabase also reloads via DDL event triggers; this NOTIFY is belt-and-suspenders).
NOTIFY pgrst, 'reload schema';
