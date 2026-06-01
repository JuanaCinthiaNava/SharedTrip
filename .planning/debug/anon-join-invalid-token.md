---
status: diagnosed
trigger: "Opening seed invite link /join/22222222-2222-2222-2222-222222222222 on production shows 'ese link de invitación está mal' (invalidJoinToken) instead of landing in the trip as an anonymous member."
created: 2026-06-01T00:00:00Z
updated: 2026-06-01T00:00:00Z
---

## Current Focus

hypothesis: RLS chicken-and-egg — the trips SELECT policy `USING (is_trip_member(id))` filters the trip row out because the just-created anonymous user is NOT yet a member when the invite_token lookup runs. .single() gets 0 rows → PGRST116 → mapped to invalidJoinToken.
test: Read code + RLS policies; confirm trips SELECT policy requires membership, and joinTrip queries trips BEFORE inserting into trip_members. Optionally confirm via live DB service-role vs anon query.
expecting: trips SELECT policy gates on is_trip_member(id), which returns false for a brand-new anon user → row invisible → PGRST116.
next_action: Confirm policy + code ordering; attempt live DB verification if credentials available.

## Symptoms

expected: Fresh Safari opens /join/22222222-..., user signed in anonymously, trip_members row upserted, lands at /t/11111111-.../docs with no login prompt.
actual: App reports invite link invalid (redirect to /?error=...invalidJoinToken...). User never enters trip.
errors: "ese link de invitación está mal" → es.errors.invalidJoinToken, returned by joinTrip() when trips lookup by invite_token yields PGRST116 (no row).
reproduction: Open seed invite URL in a fresh browser (UAT Test 5).
started: First real anonymous-join test during Phase 01 UAT (2026-06-01). Passed automated verification before.

## Eliminated

- hypothesis: Seed migration 20260530000004 never applied to live DB → trip row absent.
  evidence: Service-role REST query `trips?invite_token=eq.22222222-...` returned the row {id: 11111111-..., name: "Viaje de Prueba (Phase 1)", invite_token: 22222222-...}. Row exists.
  timestamp: 2026-06-01T00:00:00Z

- hypothesis: signInAnonymously() failing (anon provider disabled on live project) and error mismapped.
  evidence: POST /auth/v1/signup with publishable key returned a valid anonymous access_token (amr method "anonymous"). Anonymous sign-in works on the live project. config.toml also has enable_anonymous_sign_ins = true.
  timestamp: 2026-06-01T00:00:00Z

- hypothesis: invite_token column type / value mismatch (uuid vs text).
  evidence: Service-role query matched on `invite_token=eq.22222222-...` and returned the row — the stored uuid value equals the URL token exactly. No mismatch.
  timestamp: 2026-06-01T00:00:00Z

## Evidence

- timestamp: 2026-06-01T00:00:00Z
  checked: src/actions/members.ts joinTrip() ordering
  found: Step 1 signInAnonymously (creates brand-new authenticated user, NOT yet in trip_members). Step 2 selects trips by invite_token with .single(). Step 3 (the trip_members upsert that would make them a member) runs AFTER the select. So the trips lookup happens before membership exists.
  implication: The select runs under RLS as a user who is not a trip member.

- timestamp: 2026-06-01T00:00:00Z
  checked: trips SELECT RLS policy (migration 20260530000001, lines 157-160)
  found: `CREATE POLICY "Members can view their trips" ON trips FOR SELECT TO authenticated USING (is_trip_member(id));` — the ONLY SELECT policy on trips. There is no policy permitting lookup by invite_token. is_trip_member(id) checks trip_members for (id, auth.uid()).
  implication: A non-member authenticated user can see ZERO trips. The anon user is filtered from the row even though the token is valid.

- timestamp: 2026-06-01T00:00:00Z
  checked: LIVE DB (A) service-role select trips by invite_token (bypasses RLS)
  found: Returned [{"id":"11111111-1111-1111-1111-111111111111","name":"Viaje de Prueba (Phase 1)","invite_token":"22222222-2222-2222-2222-222222222222","created_by":"00000000-...-0001"}]. Row exists and token matches.
  implication: The trip and token are genuinely present. Failure is NOT missing data.

- timestamp: 2026-06-01T00:00:00Z
  checked: LIVE DB (B) signInAnonymously then identical select trips by invite_token (RLS active)
  found: Anonymous sign-in returned a valid access_token. The SAME query `trips?invite_token=eq.22222222-...` executed with that anon bearer token returned [] (empty array).
  implication: SMOKING GUN. Identical query: row visible to service-role, invisible to fresh anon user. RLS filters it out because the anon user is not yet a trip member. .single() over [] → PGRST116 → es.errors.invalidJoinToken. Confirms the chicken-and-egg root cause and refutes all secondary hypotheses.

## Resolution

root_cause: RLS chicken-and-egg in the anonymous join flow. joinTrip() looks up the trip by invite_token (with .single()) BEFORE inserting the trip_members row. The trips table's only SELECT policy, "Members can view their trips" USING (is_trip_member(id)), restricts visibility to existing members. A just-created anonymous user is not yet a member, so the query returns 0 rows (verified live: service-role returns the row, anon returns []). .single() converts 0 rows to PostgREST error PGRST116, which joinTrip maps to es.errors.invalidJoinToken — reported to the user as "ese link de invitación está mal" even though the token is valid and the trip exists. There is no RLS path that permits looking up a trip by its invite_token without already being a member.
fix:
verification:
files_changed: []
