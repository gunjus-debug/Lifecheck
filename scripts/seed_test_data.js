#!/usr/bin/env node
// Seed the Supabase project with a test user, schedule, and token using the service role key.
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment or .env.local

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY environment variables. Copy .env.local.example to .env.local and fill values.');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  try {
    const userId = '11111111-1111-1111-1111-111111111111';
    const scheduleId = '22222222-2222-2222-2222-222222222222';
    const tokenId = '33333333-3333-3333-3333-333333333333';

    await supabase.from('users').upsert([
      { id: userId, email: 'test+user@example.com', phone: '+15550001111', full_name: 'Test User', timezone: 'UTC' }
    ]);

    await supabase.from('check_in_schedules').upsert([
      { id: scheduleId, user_id: userId, frequency: 'daily', interval: 1, next_check_in_at: new Date(Date.now() + 3600 * 1000).toISOString(), active: true }
    ]);

    await supabase.from('vault_access_tokens').upsert([
      { id: tokenId, user_id: userId, token: 'TEST_TOKEN', purpose: 'check_in_link', expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), used: false, metadata: { scheduleId } }
    ]);

    console.log('Seeded test user, schedule, and token (TEST_TOKEN).');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message || err);
    process.exit(1);
  }
})();
