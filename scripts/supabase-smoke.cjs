// scripts/supabase-smoke.cjs
// Simple server-side write test using the service role key.
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Manually load .env.local (similar to prior Airtable smoke)
try {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  content
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .forEach((line) => {
      const m = line.match(/^\s*([^=#\s]+)\s*=\s*(.*)\s*$/);
      if (!m) return;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    });
} catch (err) {
  console.error('Failed to load .env.local', err);
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function run() {
  const { data, error } = await supabase.from('email_captures').insert({
    email: 'smoke@supa.test',
    opt_in: true,
    rating: 5,
    source: 'supabase-smoke',
  });

  if (error) {
    console.error('Supabase insert error:', error);
    process.exit(1);
  }

  console.log('Supabase insert success:', data);
  process.exit(0);
}

run();

