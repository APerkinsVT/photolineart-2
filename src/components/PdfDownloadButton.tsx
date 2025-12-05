import { useState } from 'react';
import type { PhotoItem } from '../types/photo';
import { downloadPdfForItem } from '../services/pdfService';

interface PdfDownloadButtonProps {
  item: PhotoItem;
  portalUrl?: string;
  qrPngUrl?: string;
}

export function PdfDownloadButton({ item, portalUrl, qrPngUrl }: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!item.lineArtUrl) {
    return null;
  }

  const onClick = async () => {
    try {
      setIsGenerating(true);
      await downloadPdfForItem(item, portalUrl, qrPngUrl);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to build PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-primary"
      onClick={onClick}
      disabled={isGenerating}
      style={{ opacity: isGenerating ? 0.7 : 1, minWidth: '140px' }}
    >
      {isGenerating ? 'Building PDF…' : 'Download PDF'}
    </button>
  );
}
