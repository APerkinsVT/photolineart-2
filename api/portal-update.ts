import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { z } from 'zod';

const ERROR_CODES = {
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  INVALID_BODY: 'INVALID_BODY',
  MISCONFIGURED: 'MISCONFIGURED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

const paletteSchema = z.object({
  fcNo: z.string(),
  fcName: z.string(),
  hex: z.string(),
});

const tipSchema = z.object({
  region: z.string(),
  fcNo: z.string(),
  fcName: z.string(),
  hex: z.string(),
  tip: z.string(),
  colors: z
    .array(
      z.object({
        fcNo: z.string(),
        fcName: z.string(),
        hex: z.string(),
      }),
    )
    .optional(),
});

const manifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  portalUrl: z.string().url().optional(),
  qrPngUrl: z.string().url().optional(),
  items: z
    .array(
      z.object({
        title: z.string().optional(),
        originalUrl: z.string().url(),
        lineArtUrl: z.string().url(),
        palette: z.array(paletteSchema),
        tips: z.array(tipSchema),
        setSize: z.number().optional(),
      }),
    )
    .default([]),
  model: z
    .object({
      name: z.string(),
      version: z.string(),
    })
    .optional(),
});

function sendError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, ERROR_CODES.METHOD_NOT_ALLOWED, 'Use POST to update portal.');
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return sendError(res, 500, ERROR_CODES.MISCONFIGURED, 'Blob token not configured.');
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const parsed = manifestSchema.safeParse(payload);
  if (!parsed.success) {
    return sendError(res, 400, ERROR_CODES.INVALID_BODY, 'Manifest payload invalid.');
  }

  try {
    const { id, items, title = '', model, portalUrl, qrPngUrl } = parsed.data;
    const manifest = {
      id,
      createdAt: new Date().toISOString(),
      title,
      items,
      portalUrl: portalUrl ?? '',
      qrPngUrl,
      model: model ?? { name: '', version: '' },
    };
    const pathname = `portals/${id}/manifest.json`;
    const result = await put(pathname, JSON.stringify(manifest, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: blobToken,
      allowOverwrite: true,
    });
    return res.status(200).json({ manifestUrl: result.url });
  } catch (error) {
    console.error('Failed to update portal manifest', error);
    return sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'Unable to update manifest.');
  }
}
