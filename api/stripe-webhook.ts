import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { getOrCreateCreditsByEmail, updateCreditsByEmail } from './lib/credits.js';

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

const CREDIT_PACK_SIZE = 3;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Verify Stripe signature with STRIPE_WEBHOOK_SECRET using the raw body.
  const isProd = process.env.NODE_ENV === 'production';
  const webhookSecret = process.env[
    isProd ? 'STRIPE_WEBHOOK_SECRET_LIVE' : 'STRIPE_WEBHOOK_SECRET_TEST'
  ];
  if (!webhookSecret) {
    console.warn('Stripe webhook secret is not configured.');
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = payload?.type;

    if (eventType === 'checkout.session.completed') {
      const session = payload?.data?.object;
      const offer = session?.metadata?.offer;
      const email = session?.customer_email || session?.metadata?.email;

      if (offer === 'credits3' && email) {
        const credits = await getOrCreateCreditsByEmail(email);
        const nowIso = new Date().toISOString();
        const nextRemaining = (credits.credits_remaining ?? 0) + CREDIT_PACK_SIZE;
        await updateCreditsByEmail(email, {
          credits_remaining: nextRemaining,
          total_purchased: (credits.total_purchased ?? 0) + CREDIT_PACK_SIZE,
          last_purchase_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error', error);
    return res.status(400).json({ error: 'Webhook handler failed' });
  }
}
