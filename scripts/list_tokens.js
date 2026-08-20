#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load .env.local if present (simple parser)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx);
    const val = line.slice(idx + 1);
    process.env[key] = val;
  }
}

(async () => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
      process.exit(2);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase.from('vault_access_tokens').select('*').limit(50);
    if (error) throw error;
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to list tokens:', err.message || err);
    process.exit(1);
  }
})();
