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
    (import.meta as unknown as { env?: { VITE_BLOB_READ_WRITE_TOKEN?: string } }).env
      ?.VITE_BLOB_READ_WRITE_TOKEN ||
    // fallback for SSR/dev in case process.env is injected
    (typeof process !== 'undefined'
      ? (process.env as Record<string, string | undefined>).VITE_BLOB_READ_WRITE_TOKEN
      : undefined);

  if (!token) throw new Error('Missing VITE_BLOB_READ_WRITE_TOKEN');

  const arrayBuffer =
    data instanceof Uint8Array ? new Uint8Array(data).buffer : new Uint8Array(data).buffer;
  const blob = new Blob([arrayBuffer], { type: contentType });
  const res = await put(path, blob, {
    access: 'public',
    contentType,
    token,
  });
  return res.url;
}
