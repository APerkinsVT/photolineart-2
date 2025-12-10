import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    res.status(500).send('Missing BLOB_READ_WRITE_TOKEN');
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { dataUrl, path } = body || {};
    if (!dataUrl || !path) {
      res.status(400).send('Missing dataUrl or path');
      return;
    }

    const base64 = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    const result = await put(path, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      token,
      allowOverwrite: true,
    });

    res.status(200).json({ url: result.url });
  } catch (err) {
    console.error('upload-pdf failed', err);
    res.status(500).send('Upload failed');
  }
}
