import type { PhotoItem } from '../types/photo';
import type { PortalManifest } from '../types/manifest';
import { buildPdfForItem, buildBundleBook, buildPdfForItemDataUrl } from '../print/pdfBuilder';

export async function downloadPdfForItem(item: PhotoItem, portalUrl?: string, qrPngUrl?: string) {
  if (!item.lineArtUrl) {
    throw new Error('Line art is not ready yet.');
  }
  await buildPdfForItem(item, { portalUrl, qrPngUrl });
}

export async function buildPdfDataUrlForItem(item: PhotoItem, portalUrl?: string, qrPngUrl?: string) {
  return buildPdfForItemDataUrl(item, { portalUrl, qrPngUrl });
}

export async function downloadBundleBook(manifest: PortalManifest) {
  await buildBundleBook(manifest);
}
