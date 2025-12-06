import type { PhotoItem } from '../types/photo';
import type { PortalManifest } from '../types/manifest';

async function loadPdfBuilder() {
  return import('../print/pdfBuilder');
}

export async function downloadPdfForItem(item: PhotoItem, portalUrl?: string, qrPngUrl?: string) {
  if (!item.lineArtUrl) {
    throw new Error('Line art is not ready yet.');
  }
  const { buildPdfForItem } = await loadPdfBuilder();
  await buildPdfForItem(item, { portalUrl, qrPngUrl });
}

export async function buildPdfDataUrlForItem(item: PhotoItem, portalUrl?: string, qrPngUrl?: string) {
  const { buildPdfForItemDataUrl } = await loadPdfBuilder();
  return buildPdfForItemDataUrl(item, { portalUrl, qrPngUrl });
}

export async function downloadBundleBook(manifest: PortalManifest) {
  const { buildBundleBook } = await loadPdfBuilder();
  await buildBundleBook(manifest);
}

export async function buildBundleBookDataUrl(manifest: PortalManifest) {
  const { buildBundleBookDataUrl } = await loadPdfBuilder();
  return buildBundleBookDataUrl(manifest);
}
