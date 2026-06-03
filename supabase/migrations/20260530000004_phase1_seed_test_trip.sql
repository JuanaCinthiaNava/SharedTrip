-- Phase 1 test data only. Remove during Phase 5 cleanup or before production launch.
-- All INSERTs use ON CONFLICT DO NOTHING so this migration is idempotent.
-- The seed user '00000000-...-0001' is a sentinel for the Phase 1 seed admin.
-- The seed trip '11111111-...' has invite_code 'TEST-AB12' — Phase 1 UAT types this code to join.
-- invite_token '22222222-...' is retained (vestigial — entry now resolves by invite_code).

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'phase1-test@sharedtrip.invalid',
  '{"display_name":"Phase 1 Seed Admin"}'::jsonb,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trips (id, name, description, start_date, end_date, created_by, invite_token, invite_code)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Viaje de Prueba (Phase 1)',
  'Trip seeded by Plan 02 so Plan 04 can validate the anonymous-join flow.',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  '00000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'TEST-AB12'
) ON CONFLICT (id) DO NOTHING;

-- Idempotent: if the seed row already exists (ON CONFLICT did nothing above),
-- ensure it still gets the typeable invite_code set. Migration 000006 backfill
-- may have assigned a generated code — this UPDATE corrects it to 'TEST-AB12'.
UPDATE public.trips
  SET invite_code = 'TEST-AB12'
  WHERE id = '11111111-1111-1111-1111-111111111111'
    AND invite_code IS DISTINCT FROM 'TEST-AB12';

INSERT INTO public.trip_members (trip_id, user_id, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'admin'
) ON CONFLICT DO NOTHING;
