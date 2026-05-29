-- Phase 1 test data only. Plan 04 will validate /join/{invite_token=22222222...} against this row.
-- Remove during Phase 5 cleanup or before production launch.
-- All INSERTs use ON CONFLICT DO NOTHING so this migration is idempotent.
-- The seed user '00000000-...-0001' is a sentinel for the Phase 1 seed admin.
-- The seed trip '11111111-...' has invite_token '22222222-...' — Plan 04 joins against this token.

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'phase1-test@sharedtrip.invalid',
  '{"display_name":"Phase 1 Seed Admin"}'::jsonb,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trips (id, name, description, start_date, end_date, created_by, invite_token)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Viaje de Prueba (Phase 1)',
  'Trip seeded by Plan 02 so Plan 04 can validate the anonymous-join flow.',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  '00000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trip_members (trip_id, user_id, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'admin'
) ON CONFLICT DO NOTHING;
