import { jsPDF } from 'jspdf';
import type { PhotoItem } from '../types/photo';
import type { PortalManifest } from '../types/manifest';
import { PAGE, LINE_ART_OPACITY, FONTS } from './pdfConstants';
import { GENERIC_TIP_ENTRIES, GENERIC_TIP_TEXT } from './pdfGenericTips';
import { fetchImageAsDataUrl, slugifyFileName, type LoadedImage } from './pdfUtils';
import { getTipColors } from '../utils/tipColors';
type AnalysisTipArray = NonNullable<PhotoItem['analysis']>['tips'];
type AnalysisTip = AnalysisTipArray[number];
type AnalysisPalette = NonNullable<PhotoItem['analysis']>['palette'];

type FCPaletteEntry = {
  id: string | number;
  name: string;
  hex: string;
  swatchFilename: string;
};
let fcPaletteCache: Record<string, FCPaletteEntry> | null = null;
let fontCache: Record<string, string> = {};
let fontsLoaded = false;
const fontsToLoad: Array<{ url: string; name: string; weight: 'normal' | 'bold' }> = [
  { url: '/fonts/Playfair_Display/static/PlayfairDisplay-Regular.ttf', name: 'Playfair', weight: 'normal' },
  { url: '/fonts/Playfair_Display/static/PlayfairDisplay-Bold.ttf', name: 'Playfair', weight: 'bold' },
  { url: '/fonts/Inter/static/Inter_18pt-Regular.ttf', name: 'Inter', weight: 'normal' },
  { url: '/fonts/Inter/static/Inter_18pt-SemiBold.ttf', name: 'Inter', weight: 'bold' },
];

interface BuildPdfOptions {
  portalUrl?: string;
  qrPngUrl?: string;
}

type Orientation = keyof typeof PAGE;

export async function buildPdfForItem(item: PhotoItem, options: BuildPdfOptions = {}) {
  const portalUrl = options.portalUrl ?? window.location.origin;

  const fcPaletteMap = await loadFcPaletteMap();
  const swatchEntries = resolveSwatchEntries(item.analysis?.palette ?? [], fcPaletteMap);
  await ensureFontsLoaded();

  let lineArtData: LoadedImage | null = null;
  let referenceData: LoadedImage | null = null;
  try {
    if (item.lineArtUrl) {
      lineArtData = await fetchImageAsDataUrl(item.lineArtUrl);
    }
    if (item.referenceUrl) {
      referenceData = await fetchImageAsDataUrl(item.referenceUrl);
    } else if (item.previewUrl) {
      referenceData = await fetchImageAsDataUrl(item.previewUrl);
    } else if (item.blobUrl) {
      referenceData = await fetchImageAsDataUrl(item.blobUrl);
    }
  } catch (error) {
    console.warn('Failed to load image for PDF', error);
  }

  const orientation: Orientation = chooseOrientation(lineArtData ?? referenceData);
  const pageConfig = PAGE[orientation];
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'letter',
  });
  registerFonts(doc);
  setBodyFont(doc);
  doc.setTextColor(15, 23, 31);

  renderLineArtPage(doc, lineArtData, pageConfig, getPageMargins(pageConfig, 1));
  doc.addPage(undefined, orientation);
  await renderInfoPage(doc, pageConfig, {
    referenceData,
    fileName: formatTitle(item.fileName),
    tips: (item.analysis?.tips ?? []) as AnalysisTipArray,
    palette: (item.analysis?.palette ?? []) as AnalysisPalette | [],
    swatchEntries,
    portalUrl,
    qrPngUrl: options.qrPngUrl,
  });

  const fileName = `${slugifyFileName(item.fileName, 'photolineart')}.pdf`;
  doc.save(fileName);
}

export async function buildPdfForItemDataUrl(item: PhotoItem, options: BuildPdfOptions = {}) {
  const portalUrl = options.portalUrl ?? window.location.origin;

  const fcPaletteMap = await loadFcPaletteMap();
  const swatchEntries = resolveSwatchEntries(item.analysis?.palette ?? [], fcPaletteMap);
  await ensureFontsLoaded();

  let lineArtData: LoadedImage | null = null;
  let referenceData: LoadedImage | null = null;
  try {
    if (item.lineArtUrl) {
      lineArtData = await fetchImageAsDataUrl(item.lineArtUrl);
    }
    if (item.referenceUrl) {
      referenceData = await fetchImageAsDataUrl(item.referenceUrl);
    } else if (item.previewUrl) {
      referenceData = await fetchImageAsDataUrl(item.previewUrl);
    } else if (item.blobUrl) {
      referenceData = await fetchImageAsDataUrl(item.blobUrl);
    }
  } catch (error) {
    console.warn('Failed to load image for PDF', error);
  }

  const orientation: Orientation = chooseOrientation(lineArtData ?? referenceData);
  const pageConfig = PAGE[orientation];
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'letter',
  });
  registerFonts(doc);
  setBodyFont(doc);
  doc.setTextColor(15, 23, 31);

  renderLineArtPage(doc, lineArtData, pageConfig, getPageMargins(pageConfig, 1));
  doc.addPage(undefined, orientation);
  await renderInfoPage(doc, pageConfig, {
    referenceData,
    fileName: formatTitle(item.fileName),
    tips: (item.analysis?.tips ?? []) as AnalysisTipArray,
    palette: (item.analysis?.palette ?? []) as AnalysisPalette | [],
    swatchEntries,
    portalUrl,
    qrPngUrl: options.qrPngUrl,
  });

  const fileName = `${slugifyFileName(item.fileName, 'photolineart')}.pdf`;
  const dataUrl = doc.output('datauristring');
  return { dataUrl, fileName };
}

function chooseOrientation(image: LoadedImage | null): Orientation {
  if (image && image.width > image.height) {
    return 'landscape';
  }
  return 'portrait';
}

function renderLineArtPage(
  doc: jsPDF,
  lineArtData: LoadedImage | null,
  pageConfig: (typeof PAGE)[Orientation],
  marginConfig: ReturnType<typeof getPageMargins>,
) {
  const availableWidth = pageConfig.width - (marginConfig.left + marginConfig.right);
  const availableHeight = pageConfig.height - (marginConfig.top + marginConfig.bottom);

  if (lineArtData) {
    const gState = doc.GState({ opacity: LINE_ART_OPACITY });
    doc.setGState(gState);
    const { width, height } = fitInsideBox(
      lineArtData.width,
      lineArtData.height,
      availableWidth,
      availableHeight,
    );
    const offsetX = marginConfig.left + (availableWidth - width) / 2;
    const offsetY = marginConfig.top + (availableHeight - height) / 2;
    doc.addImage(lineArtData.dataUrl, 'PNG', offsetX, offsetY, width, height);
    doc.setGState(doc.GState({ opacity: 1 }));
  } else {
    setBodyFont(doc, 'bold');
    doc.setFontSize(FONTS.subheading);
    doc.text('Line art unavailable', marginConfig.left, marginConfig.top + 10);
  }
}

async function renderInfoPage(
  doc: jsPDF,
  pageConfig: (typeof PAGE)[Orientation],
  params: {
    referenceData: LoadedImage | null;
    fileName: string;
    tips: AnalysisTipArray;
    palette: AnalysisPalette | [];
    swatchEntries: FCPaletteEntry[];
    portalUrl: string;
    qrPngUrl?: string;
  },
) {
  const marginConfig = getPageMargins(pageConfig, doc.getNumberOfPages() || 1);
  const startX = marginConfig.left;
  const pageWidth = pageConfig.width - (marginConfig.left + marginConfig.right);
  let cursorY: number = marginConfig.top;

  setHeadingFont(doc);
  setHeadingFont(doc);
  doc.setFontSize(FONTS.heading);
  doc.text(params.fileName, pageConfig.width / 2, cursorY, { align: 'center' });
  cursorY += 5;

  if (params.referenceData) {
    const isLandscape = pageConfig.width > pageConfig.height;
    const maxWidth = Math.min(pageWidth, 95) * (isLandscape ? 0.6 : 0.8); // shrink more on landscape
    const { width, height } = fitInsideBox(
      params.referenceData.width,
      params.referenceData.height,
      maxWidth,
      70,
    );
    const offsetX = marginConfig.left + (pageWidth - width) / 2;
    doc.addImage(params.referenceData.dataUrl, 'JPEG', offsetX, cursorY, width, height);
    cursorY += height + 8;
  } else {
    setBodyFont(doc);
    doc.setFontSize(FONTS.body);
    doc.text('Reference image unavailable', marginConfig.left, cursorY + 6);
    cursorY += 20;
  }

  const fallbackTips = GENERIC_TIP_TEXT.slice(0, 6).map((tip, idx) => ({
    region: `Tip ${idx + 1}`,
    tip,
    fcNo: '',
    fcName: '',
    hex: '#000000',
  })) as AnalysisTipArray;
  const tipEntries: AnalysisTipArray = params.tips.length > 0 ? params.tips : fallbackTips;

  // Palette row using swatch images (up to 12)
  if ((params.swatchEntries ?? []).length > 0) {
    const swatches = params.swatchEntries.slice(0, 12);
    const swatchHeight = 10;
    const swatchWidth = 14;
    const gap = 6;
    const totalWidth = swatches.length * (swatchWidth + gap) - gap;
    let cursorX = pageConfig.width / 2 - totalWidth / 2;

    const swatchImages: Array<{ entry: FCPaletteEntry; img: LoadedImage | null }> = await Promise.all(
      swatches.map(async (entry) => {
        try {
          const img = await fetchImageAsDataUrl(`/swatches/${entry.swatchFilename}`);
          return { entry, img };
        } catch {
          return { entry, img: null };
        }
      }),
    );

    doc.setFontSize(FONTS.small);
    swatchImages.forEach(({ entry, img }, idx) => {
      if (idx > 0) cursorX += swatchWidth + gap;
      if (img) {
        const { width, height } = fitInsideBox(img.width, img.height, swatchWidth, swatchHeight);
        const offsetX = cursorX + (swatchWidth - width) / 2;
        doc.addImage(img.dataUrl, 'PNG', offsetX, cursorY, width, height);
      } else {
        doc.setDrawColor(220, 224, 230);
        doc.rect(cursorX, cursorY, swatchWidth, swatchHeight);
      }
      doc.text(`FC ${entry.id}`, cursorX + swatchWidth / 2, cursorY + swatchHeight + 4.5, { align: 'center' });
    });
    cursorY += swatchHeight + 10;
    doc.setDrawColor('#e2e8f0');
    doc.line(marginConfig.left, cursorY, pageConfig.width - marginConfig.right, cursorY);
    cursorY += 6;
  }

  const maxY = pageConfig.height - marginConfig.bottom - 12;
  tipEntries.slice(0, 8).forEach((tip, index) => {
    // Skip tips that would overflow the bottom margin
    if (cursorY + 30 > maxY) {
      return;
    }
    cursorY = renderTipBlock(doc, pageConfig, tip as AnalysisTip, params.palette, cursorY, marginConfig);
    if (index < tipEntries.length - 1) {
      doc.setDrawColor('#e2e8f0');
      doc.line(marginConfig.left, cursorY, pageConfig.width - marginConfig.right, cursorY);
      cursorY += 1.5;
    }
  });

  cursorY += 4;
  doc.setFontSize(FONTS.body);
  if (params.qrPngUrl) {
    doc.addImage(params.qrPngUrl, 'PNG', startX, cursorY, 25, 25);
  }
}

function renderCoverPage(doc: jsPDF) {
  const pageConfig = PAGE.portrait;
  const margins = getPageMargins(pageConfig, 1);
  setHeadingFont(doc);
  doc.setFontSize(FONTS.heading + 8);
  doc.text('', margins.left, pageConfig.height / 2);
}

function renderInsideCoverPage(doc: jsPDF, manifest: PortalManifest) {
  const pageConfig = PAGE.portrait;
  const margins = getPageMargins(pageConfig, doc.getNumberOfPages() || 1);
  setHeadingFont(doc, 'normal');
  doc.setFontSize(FONTS.subheading);
  doc.text('Dedication', margins.left, margins.top + 12);
  doc.setDrawColor('#e2e8f0');
  doc.rect(margins.left, margins.top + 16, pageConfig.width - (margins.left + margins.right), 40);
  const contentsStart = pageConfig.height / 2;
  setHeadingFont(doc);
  doc.setFontSize(FONTS.heading);
  doc.text('Contents', margins.left, contentsStart);
  setBodyFont(doc);
  doc.setFontSize(FONTS.body);
  manifest.items.forEach((item, index) => {
    const title = item.title ?? formatTitleFromUrl(item.originalUrl, `Photo ${index + 1}`);
    doc.text(`${index + 1}. ${title}`, margins.left, contentsStart + 10 + index * 6);
  });
}

function renderGenericTipsPage(doc: jsPDF) {
  const pageConfig = PAGE.portrait;
  const margins = getPageMargins(pageConfig, doc.getNumberOfPages() || 1);
  let cursorY = margins.top;
  setHeadingFont(doc);
  doc.setFontSize(FONTS.heading);
  doc.text('Colored Pencil Tips', margins.left, cursorY + 12);
  cursorY += 24;
  GENERIC_TIP_ENTRIES.forEach((tip, index) => {
    setBodyFont(doc, 'bold');
    doc.setFontSize(FONTS.body);
    doc.text(`${index + 1}. ${tip.title}`, margins.left, cursorY);
    cursorY += 5;
    setBodyFont(doc);
    doc.setFontSize(FONTS.body - 1);
    const wrapped = doc.splitTextToSize(tip.body, pageConfig.width - (margins.left + margins.right));
    doc.text(wrapped, margins.left, cursorY);
    cursorY += wrapped.length * 4.5 + 6;
  });
}

async function renderReferenceSpread(doc: jsPDF, item: PortalManifest['items'][number], portalUrl: string) {
  const pageConfig = PAGE.portrait;
  const referenceData = await fetchImageAsDataUrl(item.originalUrl);
  const fcPaletteMap = await loadFcPaletteMap();
  const swatchEntries = resolveSwatchEntries(item.palette ?? [], fcPaletteMap);
  await renderInfoPage(doc, pageConfig, {
    referenceData,
    fileName: item.title ?? formatTitleFromUrl(item.originalUrl, 'Line Art'),
    tips: item.tips,
    palette: item.palette,
    swatchEntries,
    portalUrl,
  });
}

function renderPortalSummaryPage(doc: jsPDF, manifest: PortalManifest) {
  const pageConfig = PAGE.portrait;
  const margins = getPageMargins(pageConfig, doc.getNumberOfPages() || 1);
  setHeadingFont(doc);
  doc.setFontSize(FONTS.heading);
  doc.text('To visit your portal, scan the QR code below:', pageConfig.width / 2, margins.top + 10, {
    align: 'center',
  });
  if (manifest.qrPngUrl) {
    const size = 25.4; // 1 inch
    const centerX = pageConfig.width / 2;
    const centerY = pageConfig.height / 2;
    doc.addImage(
      manifest.qrPngUrl,
      'PNG',
      centerX - size / 2,
      centerY - size / 2,
      size,
      size,
    );
    setBodyFont(doc);
    doc.setFontSize(FONTS.body);
    doc.text(manifest.portalUrl, centerX, centerY + size / 2 + 8, { align: 'center' });
  }
}

function renderTipBlock(
  doc: jsPDF,
  pageConfig: (typeof PAGE)[Orientation],
  tip: AnalysisTip,
  palette: AnalysisPalette | [],
  startY: number,
  margins: ReturnType<typeof getPageMargins>,
) {
  const margin = margins.left;
  let cursorY = startY + 3;
  const region = tip.region ?? 'Tip';
  const lineHeight = 4.5;
  setBodyFont(doc, 'bold');
  doc.setFontSize(FONTS.body - 1);
  const regionText = `${region} — `;
  doc.text(regionText, margin, cursorY);
  const regionWidth = doc.getTextWidth(regionText);
  setBodyFont(doc);
  const wrapWidth = pageConfig.width - (margins.left + margins.right);
  const firstLineWidth = Math.max(20, wrapWidth - regionWidth);
  const firstLineArr = doc.splitTextToSize(tip.tip, firstLineWidth);
  const firstLine = firstLineArr.shift() ?? '';
  doc.text(firstLine, margin + regionWidth, cursorY);
  let remainingText = tip.tip.slice(firstLine.length).trimStart();
  if (remainingText.length > 0) {
    const remainingWrapped = doc.splitTextToSize(remainingText, wrapWidth);
    doc.text(remainingWrapped, margin, cursorY + lineHeight);
    cursorY += (remainingWrapped.length + 1) * lineHeight;
  } else {
    cursorY += lineHeight;
  }
  const colors = getTipColors(tip, palette);
  if (colors.length > 0) {
    cursorY = renderTipColors(doc, margin, cursorY, pageConfig.width - (margins.left + margins.right), colors);
  }
  return cursorY + 1.5;
}

function renderTipColors(
  doc: jsPDF,
  startX: number,
  startY: number,
  maxWidth: number,
  colors: AnalysisPalette | [],
) {
  const chipSize = 4;
  const chipSpacing = 3;
  let cursorY = startY;
  let cursorX = startX;
  setBodyFont(doc);
  doc.setFontSize(FONTS.small);
  colors.forEach((color) => {
    if (cursorX + 48 > startX + maxWidth) {
      cursorX = startX;
      cursorY += chipSize + chipSpacing + 4;
    }
    const chipY = cursorY - chipSize / 2;
    doc.setFillColor(color.hex);
    doc.rect(cursorX, chipY, chipSize, chipSize, 'FD');
    const textY = chipY + chipSize / 2 + 1.5;
    doc.text(`${color.fcNo} ${color.fcName}`, cursorX + 6, textY);
    cursorX += 48;
  });
  return cursorY + chipSize + chipSpacing + 2;
}

function renderBackCover(doc: jsPDF) {
  const pageConfig = PAGE.portrait;
  const margins = getPageMargins(pageConfig, doc.getNumberOfPages() || 1);
  setHeadingFont(doc);
  doc.setFontSize(FONTS.heading);
  doc.text('Back Cover - TBD', margins.left, pageConfig.height / 2);
}

function renderInsideBackCoverPage(doc: jsPDF) {
  const pageConfig = PAGE.portrait;
  const margins = getPageMargins(pageConfig, doc.getNumberOfPages() || 1);
  setHeadingFont(doc);
  doc.setFontSize(FONTS.heading);
  doc.text('Inside Back Cover - TBD', margins.left, pageConfig.height / 2);
}

function fitInsideBox(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);
  return {
    width: imageWidth * ratio,
    height: imageHeight * ratio,
  };
}

async function ensureFontsLoaded() {
  if (fontsLoaded) return;
  for (const font of fontsToLoad) {
    const b64 = await fetchFontBase64(font.url);
    if (b64) {
      fontCache[font.url] = b64;
    }
  }
  fontsLoaded = true;
}

async function fetchFontBase64(url: string): Promise<string | null> {
  const cached = fontCache[url];
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const base64 = dataUrl.split(',')[1] ?? '';
    fontCache[url] = base64;
    return base64;
  } catch (e) {
    console.warn('Failed to load font', url, e);
    return null;
  }
}

function registerFonts(doc: jsPDF) {
  fontsToLoad.forEach((font) => {
    const b64 = fontCache[font.url];
    if (!b64) return;
    const fileName = font.url.split('/').pop() ?? `${font.name}.ttf`;
    doc.addFileToVFS(fileName, b64);
    doc.addFont(fileName, font.name, font.weight === 'bold' ? 'bold' : 'normal');
  });
}

async function loadFcPaletteMap(): Promise<Record<string, FCPaletteEntry>> {
  if (fcPaletteCache) return fcPaletteCache;
  const res = await fetch('/palettes/faber-castell-polychromos.json');
  if (!res.ok) {
    fcPaletteCache = {};
    return fcPaletteCache;
  }
  const data: FCPaletteEntry[] = await res.json();
  const map: Record<string, FCPaletteEntry> = {};
  data.forEach((entry) => {
    map[String(entry.id)] = entry;
  });
  fcPaletteCache = map;
  return map;
}

function resolveSwatchEntries(palette: AnalysisPalette | [], map: Record<string, FCPaletteEntry>) {
  return palette
    .map((c) => map[String(c.fcNo)] || map[String(c.fcName)] || null)
    .filter(Boolean) as FCPaletteEntry[];
}

function formatTitle(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, '');
  return base
    .split(/[-_ ]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

export async function buildBundleBook(manifest: PortalManifest) {
  await ensureFontsLoaded();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });
  registerFonts(doc);
  setBodyFont(doc);
  doc.setTextColor(15, 23, 31);
  renderCoverPage(doc);
  doc.addPage();
  renderInsideCoverPage(doc, manifest);
  doc.addPage();
  renderGenericTipsPage(doc);

  for (const item of manifest.items) {
    doc.addPage();
    await renderReferenceSpread(doc, item, manifest.portalUrl);
    doc.addPage();
    const lineArtData = await fetchImageAsDataUrl(item.lineArtUrl);
    renderBookLineArtPage(doc, lineArtData);
  }

  doc.addPage();
  renderPortalSummaryPage(doc, manifest);
  doc.addPage();
  renderInsideBackCoverPage(doc);
  doc.addPage();
  renderBackCover(doc);

  doc.save(`photolineart-book-${manifest.id}.pdf`);
}

function renderBookLineArtPage(doc: jsPDF, lineArtData: LoadedImage | null) {
  const pageConfig = PAGE.portrait;
  const margins = getPageMargins(pageConfig, doc.getNumberOfPages() || 1);
  renderLineArtPage(doc, lineArtData, pageConfig, margins);
}
function formatTitleFromUrl(url: string, fallback: string) {
  const fileName = url.split('/').pop() ?? fallback;
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt
    .split(/[-_ ]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function setHeadingFont(doc: jsPDF, weight: 'normal' | 'bold' = 'bold') {
  doc.setFont('Playfair', weight === 'bold' ? 'bold' : 'normal');
}

function setBodyFont(doc: jsPDF, weight: 'normal' | 'bold' = 'normal') {
  doc.setFont('Inter', weight === 'bold' ? 'bold' : 'normal');
}

function getPageMargins(pageConfig: (typeof PAGE)[Orientation], pageNumber: number) {
  const isOddPage = pageNumber % 2 === 1;
  return {
    left: isOddPage ? pageConfig.innerMargin : pageConfig.outerMargin,
    right: isOddPage ? pageConfig.outerMargin : pageConfig.innerMargin,
    top: pageConfig.topMargin,
    bottom: pageConfig.bottomMargin,
  };
}
