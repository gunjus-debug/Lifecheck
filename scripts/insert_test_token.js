#!/usr/bin/env node
import('node:crypto');
const { randomUUID } = await import('node:crypto');
const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.map((a, i) => {
  if (!a.startsWith('--')) return [i.toString(), a];
  const k = a.replace(/^--/, '');
  const v = argv[i+1] && !argv[i+1].startsWith('--') ? argv[i+1] : true;
  return [k, v];
}));

const token = args.token || `test-${randomUUID()}`;
const scheduleId = args.scheduleId || 'test-schedule';
const hours = parseInt(args.expires || '1', 10);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY environment variables. Set them and re-run this script.');
  process.exit(2);
}

import('@supabase/supabase-js').then(({ createClient }) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  (async () => {
    try {
      const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      const { data, error } = await supabase.from('vault_access_tokens').insert([{
        token,
        purpose: 'check_in_link',
        expires_at: expiresAt,
        used: false,
        metadata: { scheduleId },
      }]).select().single();

      if (error) throw error;
      console.log('Inserted test token:', token);
      console.log('ScheduleId used:', scheduleId);
      console.log('Expires at:', expiresAt);
      process.exit(0);
    } catch (err) {
      console.error('Insert failed:', err.message || err);
      process.exit(1);
    }
  })();
});
