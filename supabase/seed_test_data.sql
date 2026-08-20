-- Seed test user, schedule, and a vault access token for local testing.
-- Run this in the Supabase SQL editor or with psql against your project database.

-- Test IDs (change if you prefer new values):
-- user_id: 11111111-1111-1111-1111-111111111111
-- schedule_id: 22222222-2222-2222-2222-222222222222
-- token_id: 33333333-3333-3333-3333-333333333333

INSERT INTO users (id, email, phone, full_name, timezone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test+user@example.com',
  '+15550001111',
  'Test User',
  'UTC'
)
ON CONFLICT DO NOTHING;

INSERT INTO check_in_schedules (id, user_id, frequency, interval, next_check_in_at, active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'daily',
  1,
  now() + interval '1 hour',
  true
)
ON CONFLICT DO NOTHING;

INSERT INTO vault_access_tokens (id, user_id, token, purpose, expires_at, used, metadata)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'TEST_TOKEN',
  'check_in_link',
  now() + interval '1 hour',
  false,
  jsonb_build_object('scheduleId','22222222-2222-2222-2222-222222222222')
)
ON CONFLICT DO NOTHING;

-- Quick verification queries:
-- SELECT * FROM users WHERE id='11111111-1111-1111-1111-111111111111';
-- SELECT * FROM check_in_schedules WHERE id='22222222-2222-2222-2222-222222222222';
-- SELECT * FROM vault_access_tokens WHERE token='TEST_TOKEN';
