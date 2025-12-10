import { put } from '@vercel/blob/client';

/**
 * Client-side blob upload helper.
 * NOTE: Vite only exposes env vars prefixed with VITE_ to the client bundle.
 */
export async function uploadPublicBlob(
  path: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string,
) {
  const token =
    (import.meta as any).env?.VITE_BLOB_READ_WRITE_TOKEN ||
    // fallback for SSR/dev in case process.env is injected
    (typeof process !== 'undefined' ? (process.env as any).VITE_BLOB_READ_WRITE_TOKEN : undefined);

  if (!token) throw new Error('Missing VITE_BLOB_READ_WRITE_TOKEN');

  const res = await put(path, data as any, {
    access: 'public',
    contentType,
    token,
  });
  return res.url;
}
