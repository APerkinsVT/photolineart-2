import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { z } from 'zod';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 10_000_000;
const TOKEN_TTL_MS = 5 * 60 * 1000;
const UPLOAD_PREFIX = 'uploads';

const requestSchema = z.object({
  contentType: z.string(),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES).optional(),
});

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const ERROR_CODES = {
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  INVALID_BODY: 'INVALID_BODY',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  SIZE_TOO_LARGE: 'SIZE_TOO_LARGE',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

function sendError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

function buildUploadUrl(pathname: string) {
  const base = process.env.VERCEL_BLOB_API_URL ?? 'https://vercel.com/api/blob';
  const params = new URLSearchParams({ pathname });
  return `${base}/?${params.toString()}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, ERROR_CODES.METHOD_NOT_ALLOWED, 'Use POST to request upload URLs.');
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return sendError(res, 400, ERROR_CODES.INVALID_BODY, 'Request body is invalid.');
  }

  const { contentType, sizeBytes } = parsed.data;

  if (!ALLOWED_TYPES.includes(contentType)) {
    return sendError(res, 400, ERROR_CODES.INVALID_CONTENT_TYPE, 'Unsupported image type.');
  }

  if (sizeBytes && sizeBytes > MAX_FILE_BYTES) {
    return sendError(res, 400, ERROR_CODES.SIZE_TOO_LARGE, 'Image exceeds the 10MB limit.');
  }

  const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!readWriteToken) {
    return sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'Blob credentials are not configured.');
  }

  const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const extension = MIME_EXTENSION_MAP[contentType] ?? '';
  const pathname = `${UPLOAD_PREFIX}/${dateSegment}/${randomUUID()}${extension}`;
  const validUntil = Date.now() + TOKEN_TTL_MS;

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: readWriteToken,
      pathname,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: MAX_FILE_BYTES,
      validUntil,
    });

    return res.status(201).json({
      uploadUrl: buildUploadUrl(pathname),
      pathname,
      token: clientToken,
      expiresAt: new Date(validUntil).toISOString(),
    });
  } catch (error) {
    console.error('Failed to generate blob upload token', error);
    return sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'Unable to generate upload URL.');
  }
}
