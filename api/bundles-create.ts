import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { copy, put } from '@vercel/blob';
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

const bundleItemSchema = z.object({
  title: z.string().optional(),
  originalUrl: z.string().url(),
  lineArtUrl: z.string().url(),
  palette: z.array(paletteSchema),
  tips: z.array(tipSchema),
  setSize: z.number().optional(),
});

const bundleSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  portalUrl: z.string().url().optional(),
  qrPngUrl: z.string().url().optional(),
  copyAssets: z.boolean().optional(),
  model: z
    .object({
      name: z.string(),
      version: z.string(),
    })
    .optional(),
  items: z.array(bundleItemSchema).min(1),
});

function sendError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, ERROR_CODES.METHOD_NOT_ALLOWED, 'Use POST to create bundles.');
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!blobToken || !baseUrl) {
    return sendError(res, 500, ERROR_CODES.MISCONFIGURED, 'Missing Blob token or PUBLIC_BASE_URL.');
  }
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const parsed = bundleSchema.safeParse(payload);
  if (!parsed.success) {
    return sendError(res, 400, ERROR_CODES.INVALID_BODY, 'Bundle payload invalid.');
  }

  try {
    const id = parsed.data.id ?? randomUUID();
    const folder = `bundles/${id}`;
    const portalUrl = parsed.data.portalUrl ?? `${baseUrl.replace(/\/$/, '')}/p/${id}`;
    const copyAssets = parsed.data.copyAssets ?? true;
    const storeId = getStoreId(blobToken);
    const manifestItems = await buildManifestItems(parsed.data.items, {
      copyAssets,
      folder,
      token: blobToken,
    });

    const manifest = {
      id,
      createdAt: new Date().toISOString(),
      title: parsed.data.title ?? '',
      items: manifestItems,
      portalUrl,
      qrPngUrl:
        parsed.data.qrPngUrl ??
        (copyAssets ? `https://${storeId}.public.blob.vercel-storage.com/${folder}/qr.png` : ''),
      model:
        parsed.data.model ?? { name: 'google/nano-banana', version: process.env.REPLICATE_VERSION ?? '' },
    };
    const manifestResult = await put(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: blobToken,
      allowOverwrite: true,
    });
    return res.status(201).json({
      id,
      portalUrl,
      manifestUrl: manifestResult.url,
      qrPngUrl: manifest.qrPngUrl,
    });
  } catch (error) {
    console.error('Failed to create bundle', error);
    return sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'Unable to create bundle.');
  }
}

async function buildManifestItems(
  items: z.infer<typeof bundleItemSchema>[],
  options: { copyAssets: boolean; folder: string; token: string },
) {
  const { copyAssets, folder, token } = options;

  const results = [] as typeof items;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    let originalUrl = item.originalUrl;
    let lineArtUrl = item.lineArtUrl;

    if (copyAssets) {
      originalUrl = await copyAsset(item.originalUrl, `${folder}/originals/${index}.jpg`, token);
      lineArtUrl = await copyAsset(item.lineArtUrl, `${folder}/line-art/${index}.jpg`, token);
    }

    results.push({
      ...item,
      originalUrl,
      lineArtUrl,
    });
  }

  return results;
}

async function copyAsset(sourceUrl: string, targetPath: string, token: string) {
  try {
    const result = await copy(sourceUrl, targetPath, {
      access: 'public',
      token,
      allowOverwrite: true,
    });
    return result.url;
  } catch (error) {
    console.error(`Failed to copy asset ${sourceUrl} -> ${targetPath}`, error);
    throw error;
  }
}

function getStoreId(token: string) {
  return token.split('_')[3];
}
