import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del } from '@vercel/blob';
import { z } from 'zod';

const schema = z.object({
  urls: z.array(z.string().url()),
});

function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed');
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return sendError(res, 400, 'Invalid request body');
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return sendError(res, 500, 'Blob credentials are not configured');
  }

  const paths = parsed.data.urls
    .map((url) => {
      try {
        const u = new URL(url);
        // strip leading slash
        return u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
      } catch {
        return null;
      }
    })
    .filter((p): p is string => !!p);

  try {
    await Promise.all(paths.map((pathname) => del(pathname, { token })));
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('delete-asset error', err);
    return sendError(res, 500, 'Failed to delete assets');
  }
}
