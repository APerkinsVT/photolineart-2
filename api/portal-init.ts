import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import QRCode from 'qrcode';

const ERROR_CODES = {
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  MISCONFIGURED: 'MISCONFIGURED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

function sendError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, ERROR_CODES.METHOD_NOT_ALLOWED, 'Use POST to initialize portal.');
  }

  const baseUrl = process.env.PUBLIC_BASE_URL;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!baseUrl || !blobToken) {
    return sendError(res, 500, ERROR_CODES.MISCONFIGURED, 'Missing PUBLIC_BASE_URL or Blob token.');
  }

  try {
    const id = randomUUID();
    const portalUrl = `${baseUrl.replace(/\/$/, '')}/p/${id}`;
    const qrDataUrl = await QRCode.toDataURL(portalUrl, { margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1] ?? '', 'base64');

    const folder = `portals/${id}`;
    const qrResult = await put(`${folder}/qr.png`, qrBuffer, {
      access: 'public',
      contentType: 'image/png',
      token: blobToken,
    });

    const manifest = {
      id,
      createdAt: new Date().toISOString(),
      title: '',
      items: [],
      portalUrl,
      qrPngUrl: qrResult.url,
      model: { name: '', version: '' },
    };
    const manifestResult = await put(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: blobToken,
    });

    return res.status(201).json({
      id,
      portalUrl,
      qrPngUrl: qrResult.url,
      manifestUrl: manifestResult.url,
    });
  } catch (error) {
    console.error('Failed to init portal', error);
    return sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'Unable to create portal.');
  }
}
