import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Load .env.local manually (mirrors other handlers)
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

function getRequiredEnv(name: string) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing environment variable: ${name}`);
  return val;
}

const bodySchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email(),
  reason: z.string().max(200).optional(),
  message: z.string().min(5).max(5000),
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
      name: parsed.name ?? null,
      email: parsed.email,
      reason: parsed.reason ?? null,
      message: parsed.message,
    };

    const { error } = await supabase.from('contact_messages').insert(insertPayload);
    if (error) {
      console.error('Supabase contact log failed', error, insertPayload);
      return res.status(500).json({ error: 'Failed to save message' });
    }

    // Send notification email
    try {
      const smtpHost = getRequiredEnv('SMTP_HOST');
      const smtpPort = Number(getRequiredEnv('SMTP_PORT'));
      const smtpUser = getRequiredEnv('SMTP_USER');
      const smtpPass = getRequiredEnv('SMTP_PASS');
      const smtpFrom = getRequiredEnv('SMTP_FROM');

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const toAddresses = ['team@photolineart.com', 'aperkinsvt@gmail.com'];
      const summaryLines = [
        `New contact submission from PhotoLineArt`,
        ``,
        `Name: ${insertPayload.name ?? '(not provided)'}`,
        `Email: ${insertPayload.email}`,
        `Reason: ${insertPayload.reason ?? '(not provided)'}`,
        ``,
        `Message:`,
        insertPayload.message,
      ].join('\n');

      await transporter.sendMail({
        from: smtpFrom,
        to: toAddresses,
        subject: 'New PhotoLineArt contact message',
        text: summaryLines,
      });
    } catch (mailErr) {
      console.warn('Contact notification email failed (continuing):', mailErr);
    }

    console.log('Contact message logged', insertPayload);
    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad request';
    console.error('contact error', err);
    return res.status(400).json({ error: message });
  }
}
