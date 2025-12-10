import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually (mirrors other server handlers)
(() => {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    content
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.startsWith('#'))
      .forEach((line) => {
        const m = line.match(/^\s*([^=#\s]+)\s*=\s*(.*)\s*$/);
        if (!m) return;
        const key = m[1];
        let val = m[2];
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      });
  } catch {
    // ignore
  }
})();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const bodySchema = z.object({
  source: z.string().default('book'),
  pla_run_id: z.string().optional(),
  photos_count: z.number().int().optional(),
  status: z.string().default('ready'),
  manifest_url: z.string().url().optional(),
  portal_url: z.string().url().optional(),
  email: z.string().email().optional(),
  retention_choice: z.string().optional(),
  pdf_url: z.string().url().optional(),
  user_id: z.string().uuid().optional().nullable(),
  pla_run_id: z.string().optional().nullable(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = bodySchema.parse(payload);

    const insertPayload = {
      source: parsed.source,
      pla_run_id: parsed.pla_run_id ?? null,
      photos_count: parsed.photos_count ?? null,
      status: parsed.status,
      manifest_url: parsed.manifest_url ?? null,
      portal_url: parsed.portal_url ?? null,
      user_id: parsed.user_id ?? null,
      email: parsed.email ?? null,
      retention_choice: parsed.retention_choice ?? null,
      pdf_url: parsed.pdf_url ?? null,
    };
    const { error } = await supabase.from('runs').insert(insertPayload);

    if (error) {
      console.error('Supabase run log failed', error, insertPayload);
      return res.status(500).json({ error: 'Failed to log run' });
    }

    console.log('Supabase run log ok', insertPayload);

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('log-run error', err);
    return res.status(400).json({ error: err?.message ?? 'Bad request' });
  }
}
