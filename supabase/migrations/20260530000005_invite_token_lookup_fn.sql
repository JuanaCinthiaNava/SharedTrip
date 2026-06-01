-- migration: 20260530000005_invite_token_lookup_fn.sql
-- Adds the SECURITY DEFINER function get_trip_id_by_invite_token(uuid) that resolves a
-- trip id from a valid invite_token, bypassing the membership-gated trips SELECT policy
-- for THIS LOOKUP ONLY.
--
-- Why SECURITY DEFINER is required here:
-- The sole trips SELECT policy is `USING (is_trip_member(id))`. The anonymous-join flow
-- (joinTrip in src/actions/members.ts) must resolve a trip by its invite_token BEFORE the
-- freshly-created anonymous user is a member — a chicken-and-egg: a non-member sees 0 rows,
-- so the lookup returns nothing and a valid invite link is rejected. This function is the
-- controlled bypass for that one lookup. It returns ONLY the trip id (a uuid); reading any
-- trip CONTENT still requires membership via the unchanged trips SELECT policy. Possession
-- of the valid invite_token IS the intended capability.
--
-- SET search_path = public prevents schema-injection (same hardening as is_trip_member).
-- No RLS policy is added, altered, or relaxed by this migration.

CREATE OR REPLACE FUNCTION public.get_trip_id_by_invite_token(lookup_token uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.trips
  WHERE trips.invite_token = lookup_token;
$$;

-- The anonymous-join user calls this via RPC immediately after signInAnonymously().
-- Grant both anon and authenticated for safety; the only thing leaked is a trip id to a
-- caller who already possesses the valid token.
GRANT EXECUTE ON FUNCTION public.get_trip_id_by_invite_token(uuid) TO anon, authenticated;
