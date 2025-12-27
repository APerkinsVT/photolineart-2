import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

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

const bodySchema = z.object({
  email: z.string().email(),
  offer: z.string().optional(),
});

function getRequiredEnv(name: string) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing environment variable: ${name}`);
  return val;
}

function getBaseUrl(req: VercelRequest) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host || 'localhost:5173';
  return `${proto}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = bodySchema.parse(payload);

    const isProd = process.env.NODE_ENV === 'production';
    const secretKey = getRequiredEnv(
      isProd ? 'STRIPE_SECRET_LIVE_KEY' : 'STRIPE_SECRET_TEST_KEY'
    );
    const priceBook6 = getRequiredEnv(
      isProd ? 'STRIPE_PRICE_ID_6_BOOK_LIVE' : 'STRIPE_PRICE_ID_6_BOOK_TEST'
    );
    const priceCredits3 = process.env[
      isProd ? 'STRIPE_PRICE_ID_3_CREDITS_LIVE' : 'STRIPE_PRICE_ID_3_CREDITS_TEST'
    ];
    const offer = parsed.offer ?? 'book6';
    const priceId = offer === 'credits3' ? priceCredits3 : priceBook6;
    if (!priceId) {
      return res.status(500).json({ error: 'Stripe price ID missing for offer.' });
    }

    const baseUrl = getBaseUrl(req);

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.set('allow_promotion_codes', 'true');
    params.set('customer_email', parsed.email);
    if (offer === 'credits3') {
      params.set(
        'success_url',
        `${baseUrl}/?credits=success&email=${encodeURIComponent(parsed.email)}&offer=${encodeURIComponent(offer)}&session_id={CHECKOUT_SESSION_ID}`,
      );
      params.set('cancel_url', `${baseUrl}/?credits=cancelled`);
    } else {
      params.set(
        'success_url',
        `${baseUrl}/studio?paid=1&email=${encodeURIComponent(parsed.email)}&offer=${encodeURIComponent(offer)}&session_id={CHECKOUT_SESSION_ID}`,
      );
      params.set('cancel_url', `${baseUrl}/?checkout=cancelled`);
    }
    params.append('metadata[offer]', offer);
    params.append('metadata[email]', parsed.email);

    const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const stripeData = (await stripeResp.json()) as any;
    if (!stripeResp.ok) {
      console.error('Stripe checkout failed', stripeData);
      return res.status(500).json({ error: stripeData?.error?.message || 'Stripe error' });
    }

    return res.status(200).json({ url: stripeData.url });
  } catch (err) {
    console.error('Checkout session error', err);
    return res.status(500).json({ error: 'Unable to start checkout' });
  }
}
