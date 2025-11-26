import type { PaletteColor } from './palette.js';
import { getPalette } from './palette.js';

interface LabColor {
  l: number;
  a: number;
  b: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  rn = rn > 0.04045 ? ((rn + 0.055) / 1.055) ** 2.4 : rn / 12.92;
  gn = gn > 0.04045 ? ((gn + 0.055) / 1.055) ** 2.4 : gn / 12.92;
  bn = bn > 0.04045 ? ((bn + 0.055) / 1.055) ** 2.4 : bn / 12.92;

  const x = rn * 0.4124 + gn * 0.3576 + bn * 0.1805;
  const y = rn * 0.2126 + gn * 0.7152 + bn * 0.0722;
  const z = rn * 0.0193 + gn * 0.1192 + bn * 0.9505;

  const xn = x / 0.95047;
  const yn = y / 1.0;
  const zn = z / 1.08883;

  const fx = xn > 0.008856 ? xn ** (1 / 3) : (7.787 * xn) + (16 / 116);
  const fy = yn > 0.008856 ? yn ** (1 / 3) : (7.787 * yn) + (16 / 116);
  const fz = zn > 0.008856 ? zn ** (1 / 3) : (7.787 * zn) + (16 / 116);

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function deltaE76(lab1: LabColor, lab2: LabColor) {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function ensureHex(value?: string) {
  if (typeof value !== 'string' || value.length === 0) {
    console.warn('ensureHex received invalid value:', value);
    return '#000000';
  }
  return value.charAt(0) === '#' ? value : `#${value}`;
}

export interface MatchResult {
  swatch: string;
  color: PaletteColor;
  score: number;
  lab: LabColor;
}

export interface ColorTip {
  region: string;
  fcNo: string;
  fcName: string;
  hex: string;
  tip: string;
}

const DIVERSITY_THRESHOLD = 12; // deltaE threshold to encourage hue spread

interface PaletteWithLab extends PaletteColor {
  lab: LabColor;
}

interface MatchOptions {
  palette?: PaletteColor[];
}

export async function matchToFaberPalette(
  hexColors: string[],
  maxResults = 12,
  options?: MatchOptions,
) {
  const palette = options?.palette ?? (await getPalette());
  const paletteWithLab: PaletteWithLab[] = palette.map((entry) => ({
    ...entry,
    lab: rgbToLab(...hexToRgb(entry.hex)),
  }));
  const matches: MatchResult[] = [];
  const seen = new Set<string>();

  for (const hex of hexColors) {
    const normalized = ensureHex(hex);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const lab = rgbToLab(...hexToRgb(normalized));
    let best: MatchResult | null = null;
    for (const entry of paletteWithLab) {
      const { lab: entryLab, ...base } = entry;
      const score = deltaE76(lab, entryLab);
      if (!best || score < best.score) {
        best = { swatch: normalized, color: base, score, lab };
      }
    }
    if (best) {
      matches.push(best);
    }
  }

  const selected: MatchResult[] = [];
  const usedColors = new Set<string>();

  for (const match of matches) {
    if (usedColors.has(match.color.fcNo)) {
      continue;
    }
    if (selected.length > 0) {
      const minDistance = selected.reduce((min, current) => {
        const distance = deltaE76(current.lab, match.lab);
        return Math.min(min, distance);
      }, Number.POSITIVE_INFINITY);
      if (minDistance < DIVERSITY_THRESHOLD && selected.length < maxResults - 3) {
        continue;
      }
    }
    selected.push(match);
    usedColors.add(match.color.fcNo);
    if (selected.length >= maxResults) {
      break;
    }
  }

  if (selected.length < Math.min(maxResults, matches.length)) {
    for (const match of matches) {
      if (usedColors.has(match.color.fcNo)) {
        continue;
      }
      selected.push(match);
      usedColors.add(match.color.fcNo);
      if (selected.length >= maxResults) {
        break;
      }
    }
  }

  return selected.slice(0, maxResults);
}

const TIP_TEMPLATES: Array<(match: MatchResult) => string> = [
  (match) =>
    `Start with light pressure in areas that resemble swatch ${match.swatch}, then layer ${match.color.fcName} (FC ${match.color.fcNo}) for full saturation.`,
  (match) =>
    `Glaze ${match.color.fcName} (FC ${match.color.fcNo}) over mid-tones similar to ${match.swatch} and burnish gently with a colorless blender.`,
  (match) =>
    `Mix ${match.color.fcName} (FC ${match.color.fcNo}) with white to create soft highlights wherever you notice tones like ${match.swatch}.`,
];

export function buildTips(matches: MatchResult[]): ColorTip[] {
  return matches.map((match, index) => ({
    region: 'Color suggestion',
    fcNo: match.color.fcNo,
    fcName: match.color.fcName,
    hex: match.color.hex,
    tip: TIP_TEMPLATES[index % TIP_TEMPLATES.length](match),
  }));
}
