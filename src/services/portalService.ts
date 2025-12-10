import { postJson } from './apiClient';

export interface PortalInfo {
  id: string;
  portalUrl: string;
  qrPngUrl: string;
  manifestUrl: string;
}

export async function initPortal() {
  return postJson<PortalInfo>('/api/portal-init', {});
}

export interface ManifestUpdatePayload {
  id: string;
  title?: string;
  portalUrl?: string;
  qrPngUrl?: string;
  items: Array<{
    title?: string;
    originalUrl: string;
    lineArtUrl: string;
    palette: Array<{ fcNo: string; fcName: string; hex: string }>;
    tips: Array<{
      region: string;
      fcNo: string;
      fcName: string;
      hex: string;
      tip: string;
      colors?: Array<{ fcNo: string; fcName: string; hex: string }>;
    }>;
  }>;
  model?: { name: string; version: string };
}

export async function updatePortalManifest(payload: ManifestUpdatePayload) {
  return postJson<{ manifestUrl: string }>('/api/portal-update', payload);
}

export interface BundleCreatePayload {
  id?: string;
  title?: string;
  portalUrl?: string;
  qrPngUrl?: string;
  items: ManifestUpdatePayload['items'];
  model?: { name: string; version: string };
  copyAssets?: boolean;
}

export async function createBundle(payload: BundleCreatePayload) {
  return postJson<{ id: string; portalUrl: string; manifestUrl: string; qrPngUrl?: string }>(
    '/api/bundles-create',
    payload,
  );
}

export async function fetchBundleManifest(id: string) {
  const params = new URLSearchParams({ id });
  const response = await fetch(`/api/bundles-get?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Bundle not found');
  }
  return response.json();
}

