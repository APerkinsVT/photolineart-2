import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { enhanceTipColors } from './lib/tipEnhancer.js';
import { getPalette } from './lib/palette.js';

const paletteSchema = z.object({
  fcNo: z.string(),
  fcName: z.string(),
  hex: z.string(),
});

const tipSchema = z.object({
  region: z.string(),
  fcNo: z.string(),
  fcName: z.string(),
  hex: z.string(),
  tip: z.string(),
  colors: z
    .array(
      z.object({
        fcNo: z.string(),
        fcName: z.string(),
        hex: z.string(),
      }),
    )
    .optional(),
});

const payloadSchema = z.object({
  items: z.array(
    z.object({
      title: z.string().optional(),
      originalUrl: z.string().url(),
      lineArtUrl: z.string().url(),
      palette: z.array(paletteSchema),
      tips: z.array(tipSchema),
      setSize: z.number().optional(),
    }),
  ),
});

const ENHANCEMENT_CONCURRENCY = 3;
type PaletteCacheKey = number | 'all';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Use POST' } });
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Invalid tip payload' } });
  }

  try {
    const paletteCache = new Map<PaletteCacheKey, ReturnType<typeof getPalette>>();
    const loadPalette = (setSize?: number) => {
      const key: PaletteCacheKey = typeof setSize === 'number' ? setSize : 'all';
      if (!paletteCache.has(key)) {
        paletteCache.set(key, getPalette(typeof setSize === 'number' ? setSize : undefined));
      }
      return paletteCache.get(key)!;
    };

    const items = parsed.data.items;
    const results: Array<
      (typeof items)[number] & { enhancementError?: string }
    > = new Array(items.length);
    const errors: string[] = [];

    let cursor = 0;
    const workerCount = Math.min(ENHANCEMENT_CONCURRENCY, items.length);
    const workers = Array.from({ length: workerCount }, () =>
      (async function worker() {
        while (true) {
          const currentIndex = cursor;
          cursor += 1;
          if (currentIndex >= items.length) {
            break;
          }
          const item = items[currentIndex];
          try {
            const palette = await loadPalette(item.setSize);
            const enhanced = await enhanceTipColors(item.tips, palette);
            const tipsWithColors = mergeTipsWithColors(item.tips, enhanced);
            results[currentIndex] = {
              ...item,
              tips: tipsWithColors,
            };
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Tip enhancement failed';
            console.warn(`Tip enhancement failed for ${item.title ?? item.originalUrl}`, error);
            errors.push(`${item.title ?? item.originalUrl}: ${message}`);
            results[currentIndex] = {
              ...item,
              tips: item.tips,
              enhancementError: message,
            };
          }
        }
      })(),
    );
    await Promise.all(workers);

    return res.status(200).json({ items: results, errors });
  } catch (error) {
    console.error('Failed to enhance tips', error);
    return res.status(500).json({ error: { message: 'Unable to enhance tips' } });
  }
}

function mergeTipsWithColors(
  base: z.infer<typeof tipSchema>[],
  enhanced?: Array<{ region: string; colors?: Array<{ fcNo: string; fcName: string; hex: string }> }> | null,
) {
  if (!enhanced || enhanced.length === 0) {
    return base;
  }
  return base.map((tip) => {
    const match = enhanced.find((entry) => entry?.region === tip.region);
    if (match?.colors && match.colors.length > 0) {
      return {
        ...tip,
        colors: match.colors,
      };
    }
    return tip;
  });
}
