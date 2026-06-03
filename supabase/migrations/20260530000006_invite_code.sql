-- migration: 20260530000006_invite_code.sql
-- Adds invite_code text column to public.trips and the SECURITY DEFINER resolver
-- get_trip_id_by_invite_code(text) that resolves a trip id from a human-typed code
-- (case-insensitive), bypassing the membership-gated trips SELECT policy for THIS
-- LOOKUP ONLY.
--
-- Why SECURITY DEFINER is required here:
-- The sole trips SELECT policy is `USING (is_trip_member(id))`. The anonymous-join flow
-- must resolve a trip by its invite_code BEFORE the freshly-created anonymous user is a
-- member — a chicken-and-egg: a non-member sees 0 rows, so the lookup returns nothing
-- and a valid code is rejected. This function is the controlled bypass for that one
-- lookup. It returns ONLY the trip id (a uuid); reading any trip CONTENT still requires
-- membership via the unchanged trips SELECT policy. Possession of the valid invite_code
-- IS the intended invite capability.
--
-- SET search_path = public prevents schema-injection (same hardening as is_trip_member
-- and get_trip_id_by_invite_token).
-- No RLS policy is added, altered, or relaxed by this migration.
--
-- Note on invite_token: the existing invite_token uuid column and its resolver
-- get_trip_id_by_invite_token(uuid) are intentionally retained. invite_token becomes
-- vestigial for v1 entry but dropping it would require editing already-shipped,
-- verified migrations and risks the seed row. The cost of keeping a vestigial uuid
-- column is zero; the cost of dropping it is regression risk. Phase 2 (trip creation)
-- will populate invite_code going forward.

-- Step 1: Add the column as nullable first so the existing seed row (and any other
-- pre-existing rows) do not violate NOT NULL during the column add.
ALTER TABLE public.trips ADD COLUMN invite_code text;

-- Step 2: Backfill any rows that still have a NULL invite_code with a deterministic,
-- per-row-unique placeholder derived from the trip name + a hash of the id. This is
-- the safety net for non-seed rows. The seed migration (000004) runs BEFORE this one
-- (000006), so the seed row already has invite_code = 'TEST-AB12' by the time this
-- migration runs (set by the idempotent UPDATE in the edited seed migration). The WHERE
-- invite_code IS NULL clause means this backfill only touches rows still unset —
-- idempotent and safe regardless of seed-edit ordering.
UPDATE public.trips
  SET invite_code = upper(substr(replace(name, ' ', ''), 1, 4)) || '-' || upper(substr(md5(id::text), 1, 4))
  WHERE invite_code IS NULL;

-- Step 3: Enforce NOT NULL and UNIQUE constraints on invite_code.
ALTER TABLE public.trips ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE public.trips ADD CONSTRAINT trips_invite_code_key UNIQUE (invite_code);

-- Step 4: Create the case-insensitive SECURITY DEFINER resolver, mirroring
-- get_trip_id_by_invite_token exactly but accepting a text code. Input is normalized
-- (upper + trim) before lookup so a user typing 'test-ab12 ' resolves the row stored
-- as 'TEST-AB12'. Returns NULL when no match — the caller maps NULL → invalidJoinToken;
-- no error is raised and no oracle distinguishes "bad format" from "no trip" (T-01-08-03).
CREATE OR REPLACE FUNCTION public.get_trip_id_by_invite_code(lookup_code text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.trips
  WHERE trips.invite_code = upper(trim(lookup_code));
$$;

-- Grant to both anon and authenticated so the anonymous-join RPC call succeeds
-- immediately after signInAnonymously(). The only thing leaked is a trip id to a
-- caller who already possesses the valid invite code.
GRANT EXECUTE ON FUNCTION public.get_trip_id_by_invite_code(text) TO anon, authenticated;
