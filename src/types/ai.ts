export interface PaletteEntry {
  fcNo: string;
  fcName: string;
  hex: string;
}

export interface TipEntry {
  region: string;
  fcNo: string;
  fcName: string;
  hex: string;
  tip: string;
  colors?: PaletteEntry[];
}

export interface ModelInfo {
  name: string;
  version: string;
}

export interface LineArtAnalysis {
  sourceImageUrl: string;
  palette: PaletteEntry[];
  tips: TipEntry[];
  model: ModelInfo;
  paletteSetSize?: number;
  tipsModel?: ModelInfo;
}

export interface LineArtResponse {
  status?: 'ok' | 'no_credits';
  generationType?: 'free' | 'credit' | 'book';
  creditsRemaining?: number;
  lineArtUrl?: string;
  analysis?: LineArtAnalysis;
}
