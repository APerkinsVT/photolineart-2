import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface PaletteColor {
  fcNo: string;
  fcName: string;
  hex: string;
  sets: number[];
}

let cache: PaletteColor[] | null = null;

async function loadPaletteRaw(): Promise<PaletteColor[]> {
  if (cache) {
    return cache;
  }
  const filePath = path.join(process.cwd(), 'public/palettes/faber-castell-polychromos.json');
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as Array<{
    id: number;
    name: string;
    hex: string;
    sets: number[];
  }>;
  cache = parsed.map((entry) => ({
    fcNo: entry.id.toString(),
    fcName: entry.name,
    hex: entry.hex,
    sets: entry.sets,
  }));
  return cache;
}

export async function getPalette(setSize?: number) {
  const palette = await loadPaletteRaw();
  if (!setSize) {
    return palette;
  }
  return palette.filter((entry) => entry.sets.includes(setSize));
}
