import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { list, put } from '@vercel/blob';

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().default('Your PhotoLineArt coloring page'),
  text: z.string().optional(),
  pdfBase64: z.string(), // base64 string (may include data: prefix)
  filename: z.string().default('photolineart.pdf'),
  optIn: z.boolean().optional().default(false),
  rating: z.number().int().min(1).max(5).optional(),
});

function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function getRequiredEnv(name: string) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing environment variable: ${name}`);
  return val;
}

async function appendEmailLog(email: string, optIn: boolean, rating?: number) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('Email log skipped: missing BLOB_READ_WRITE_TOKEN');
    return;
  }

  const logPath = 'logs/email-captures.csv';
  let existing = '';

  try {
    const listings = await list({ token, prefix: logPath, limit: 1 });
    const match = listings.blobs.find((b) => b.pathname === logPath);
    if (match) {
      const resp = await fetch(match.url);
      if (resp.ok) {
        existing = await resp.text();
      }
    }
  } catch (err) {
    console.warn('Unable to read existing email log (continuing):', err);
  }

  const line = `${new Date().toISOString()},${email},${optIn ? '1' : '0'},${rating ?? ''}\n`;
  const hasHeader = existing.startsWith('timestamp,email');
  const header = 'timestamp,email,opt_in,rating\n';
  const body = existing ? `${existing.replace(/\s*$/, '')}\n${line}` : `${header}${line}`;
  const next = hasHeader ? body : `${header}${line}`;

  try {
    await put(logPath, next, {
      access: 'public',
      addRandomSuffix: false,
      token,
      contentType: 'text/csv',
    });
    console.log('Email log appended to', logPath);
  } catch (err) {
    console.warn('Unable to write email log (continuing):', err);
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
    const base64 = parsed.pdfBase64.includes(',')
      ? parsed.pdfBase64.split(',')[1] ?? parsed.pdfBase64
      : parsed.pdfBase64;

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
      attachments: [
        {
          filename: parsed.filename,
          content: Buffer.from(base64, 'base64'),
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    try {
      await appendEmailLog(parsed.to, parsed.optIn, parsed.rating);
    } catch (err) {
      console.warn('Log append failed', err);
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('send-pdf error', err);
    const msg = err?.message ?? 'Unexpected error';
    return sendError(res, 400, msg);
  }
}
