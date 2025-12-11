import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ---- Load .env.local manually ----
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
    // ignore if not present
  }
})();

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().default('Your PhotoLineArt coloring page'),
  text: z.string().optional(),
  pdfBase64: z.string().optional(), // base64 string (may include data: prefix)
  filename: z.string().default('photolineart.pdf'),
  optIn: z.boolean().optional().default(false),
  rating: z.number().int().min(1).max(5).optional(),
  source: z.string().optional().default('single'),
});

function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function getRequiredEnv(name: string) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing environment variable: ${name}`);
  return val;
}

// Supabase server client (service role) for logging
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseServer =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function appendEmailLog(email: string, optIn: boolean, rating: number | undefined, source: string) {
  if (!supabaseServer) {
    console.warn('Supabase client missing; skip email log.');
    return;
  }
  const { error } = await supabaseServer.from('email_captures').insert({
    email,
    opt_in: !!optIn,
    rating: typeof rating === 'number' ? rating : null,
    source,
  });
  if (error) {
    console.warn('Supabase email log insert failed (continuing):', error);
  } else {
    console.log('Email log appended to Supabase');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = bodySchema.parse(payload);

    const smtpHost = getRequiredEnv('SMTP_HOST');
    const smtpPort = Number(getRequiredEnv('SMTP_PORT'));
    const smtpUser = getRequiredEnv('SMTP_USER');
    const smtpPass = getRequiredEnv('SMTP_PASS');
    const smtpFrom = getRequiredEnv('SMTP_FROM');

    // Normalize base64 (strip data URL prefix if present)
    const base64 = parsed.pdfBase64
      ? parsed.pdfBase64.includes(',')
        ? parsed.pdfBase64.split(',')[1] ?? parsed.pdfBase64
        : parsed.pdfBase64
      : null;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // SSL if 465
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: smtpFrom,
      to: parsed.to,
      subject: parsed.subject,
      text:
        parsed.text ??
        [
          'Your coloring page is ready. The PDF is attached.',
          'Upload a photo again anytime at https://photolineart.com/',
          '',
          'Privacy first: we delete your uploaded photo and generated line art right after sending this download.',
          'If you ever want to make another page, just upload again—your images aren’t kept on our servers.',
          '',
          'Thanks for trying PhotoLineArt!',
        ].join('\n'),
      attachments: base64
        ? [
            {
              filename: parsed.filename,
              content: Buffer.from(base64, 'base64'),
              contentType: 'application/pdf',
            },
          ]
        : [],
    };

    await transporter.sendMail(mailOptions);

    try {
      await appendEmailLog(parsed.to, parsed.optIn, parsed.rating, parsed.source || 'single');
    } catch (err) {
      console.warn('Log append failed', err);
    }

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected error';
    console.error('send-pdf error', err);
    return sendError(res, 400, msg);
  }
}
