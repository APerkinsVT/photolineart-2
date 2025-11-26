export interface ManifestPaletteEntry {
  fcNo: string;
  fcName: string;
  hex: string;
}

export interface ManifestTipEntry {
  region: string;
  fcNo: string;
  fcName: string;
  hex: string;
  tip: string;
  colors?: ManifestPaletteEntry[];
}

export interface ManifestItem {
  title?: string;
  originalUrl: string;
  lineArtUrl: string;
  palette: ManifestPaletteEntry[];
  tips: ManifestTipEntry[];
  setSize?: number;
}

export interface ManifestModel {
  name: string;
  version: string;
}

export interface PortalManifest {
  id: string;
  createdAt: string;
  title: string;
  items: ManifestItem[];
  portalUrl: string;
  qrPngUrl?: string;
  model: ManifestModel;
}
