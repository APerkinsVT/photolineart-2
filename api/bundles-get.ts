import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const ERROR_CODES = {
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  INVALID_QUERY: 'INVALID_QUERY',
  NOT_FOUND: 'NOT_FOUND',
} as const;

const querySchema = z.object({
  id: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res
      .status(405)
      .json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Use GET to fetch bundles.' } });
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: { code: ERROR_CODES.INVALID_QUERY, message: 'Missing or invalid bundle id.' } });
  }

  const { id } = parsed.data;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: { code: 'MISCONFIGURED', message: 'Blob token missing.' } });
  }
  const storeId = token.split('_')[3];
  if (!storeId) {
    return res.status(500).json({ error: { code: 'MISCONFIGURED', message: 'Unable to derive blob store id.' } });
  }

  const manifestUrls = [
    `https://${storeId}.public.blob.vercel-storage.com/bundles/${id}/manifest.json`,
    `https://${storeId}.public.blob.vercel-storage.com/portals/${id}/manifest.json`,
  ];

  for (const manifestUrl of manifestUrls) {
    try {
      const response = await fetch(manifestUrl);
      if (response.ok) {
        const manifest = await response.json();
        return res.status(200).json(manifest);
      }
    } catch {
      // ignore and try next
    }
  }

  return res
    .status(404)
    .json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Bundle not found.' } });
}
