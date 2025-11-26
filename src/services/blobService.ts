import { put } from '@vercel/blob/client';
import { postJson } from './apiClient';
import type { BlobUploadRequestBody, BlobUploadResponse } from '../types/api';

export interface UploadTarget extends BlobUploadResponse {}

export async function requestUploadTarget(body: BlobUploadRequestBody) {
  return postJson<BlobUploadResponse>('/api/blob-upload', body);
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export async function uploadFileToBlob(
  file: File,
  target: UploadTarget,
  onProgress?: (progress: UploadProgress) => void,
) {
  const result = await put(target.pathname, file, {
    access: 'public',
    token: target.token,
    contentType: file.type,
    onUploadProgress: ({ loaded, total, percentage }) => {
      onProgress?.({
        loaded,
        total: total ?? file.size,
        percentage,
      });
    },
  });

  return result.url;
}
