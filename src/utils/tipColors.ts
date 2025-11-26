import type { PaletteEntry, TipEntry } from '../types/ai';

const FC_REGEX = /fc\s*(\d{2,3})/gi;

export function getTipColors(tip: TipEntry, palette: PaletteEntry[]) {
  if (tip.colors && tip.colors.length > 0) {
    return tip.colors;
  }
  const unique = new Map<string, PaletteEntry>();

  if (tip.fcNo) {
    const direct = palette.find((color) => color.fcNo === tip.fcNo);
    if (direct) {
      unique.set(direct.fcNo, direct);
    }
  }

  if (tip.tip) {
    const matches = [...tip.tip.matchAll(FC_REGEX)];
    matches.forEach((match) => {
      const fc = match[1];
      if (fc && !unique.has(fc)) {
        const entry = palette.find((color) => color.fcNo === fc);
        if (entry) {
          unique.set(entry.fcNo, entry);
        }
      }
    });
  }

  if (unique.size === 0 && tip.fcName) {
    const byName = palette.find(
      (color) => color.fcName.toLowerCase() === tip.fcName?.toLowerCase(),
    );
    if (byName) {
      unique.set(byName.fcNo, byName);
    }
  }

  if (unique.size === 0 && palette.length > 0) {
    unique.set(palette[0].fcNo, palette[0]);
  }

  return Array.from(unique.values());
}
