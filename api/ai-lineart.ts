import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { z } from 'zod';
import { extractDominantHexColors } from './lib/colorSampler.js';
import { buildTips, matchToFaberPalette, type ColorTip } from './lib/colorMatcher.js';
import { generateSemanticTips } from './lib/openAiTips.js';
import { getPalette } from './lib/palette.js';
import { enhanceTipColors } from './lib/tipEnhancer.js';
import { getOrCreateCreditsByEmail, updateCreditsByEmail } from './lib/credits.js';

const DEFAULT_PROMPT =
  'Convert this exact photo into clean black line art for a coloring book. ' +
  'Preserve composition and subjects; outlines only; minimal interior shading; white background.';

const FC_SET_SIZES = [12, 24, 36, 60, 72, 120] as const;
type FcSetSize = (typeof FC_SET_SIZES)[number];

const MIN_TIP_COUNT = 6;
const MAX_TIP_COUNT = 8;
const MIN_PALETTE_SIZE = 6;
const MAX_PALETTE_SIZE = 12;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  email: z.string().email(),
  context: z.enum(['single', 'book']).optional(),
  options: z
    .object({
      prompt: z.string().optional(),
      style: z.enum(['clean', 'sketch']).optional(),
      lineThickness: z.enum(['thin', 'medium', 'bold']).optional(),
      outputSize: z.enum(['original', 'medium', 'small']).optional(),
      setSize: z
        .number()
        .int()
        .optional()
        .refine((value) => value === undefined || FC_SET_SIZES.includes(value as FcSetSize), {
          message: 'Invalid set size.',
        }),
    })
    .optional(),
});

const ERROR_CODES = {
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  INVALID_BODY: 'INVALID_BODY',
  SERVER_ERROR: 'SERVER_ERROR',
  MISCONFIGURED: 'MISCONFIGURED',
  REPLICATE_FAILED: 'REPLICATE_FAILED',
} as const;

const REPLICATE_API_BASE = 'https://api.replicate.com/v1/predictions';
const REPLICATE_TIMEOUT_MS = 2 * 60 * 1000;

interface ReplicatePrediction {
  id: string;
  status: string;
  output?: string[] | string;
  error?: string;
}

function sendError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('ai-lineart handler invoked');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, ERROR_CODES.METHOD_NOT_ALLOWED, 'Use POST for line art generation.');
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  console.log('incoming payload', payload);
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return sendError(res, 400, ERROR_CODES.INVALID_BODY, 'Request body is invalid.');
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const replicateModel = process.env.REPLICATE_MODEL;
  const replicateVersion = process.env.REPLICATE_VERSION;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  console.log('DEBUG: Env Vars Check:', {
    hasReplicateToken: !!replicateToken,
    hasReplicateModel: !!replicateModel,
    hasReplicateVersion: !!replicateVersion,
    hasBlobToken: !!blobToken,
  });

  if (!replicateToken || !replicateModel || !replicateVersion || !blobToken) {
    console.error('Missing env vars:', {
      replicateToken: !!replicateToken,
      replicateModel: !!replicateModel,
      replicateVersion: !!replicateVersion,
      blobToken: !!blobToken,
    });
    return sendError(res, 500, ERROR_CODES.MISCONFIGURED, 'Replicate/Blob env vars are missing.');
  }

  try {
    const email = parsed.data.email;
    const context = parsed.data.context ?? 'single';
    let gateResult: {
      status: 'ok' | 'no_credits';
      generationType?: 'free' | 'credit' | 'book';
      creditsRemaining?: number;
      email?: string;
    } = {
      status: 'ok',
    };

    if (context === 'book') {
      gateResult = {
        status: 'ok',
        generationType: 'book',
      };
    } else {
      const credits = await getOrCreateCreditsByEmail(email);
      if (!credits.free_used_at) {
        gateResult = {
          status: 'ok',
          generationType: 'free',
          creditsRemaining: credits.credits_remaining,
          email: credits.email,
        };
      } else if (credits.credits_remaining > 0) {
        gateResult = {
          status: 'ok',
          generationType: 'credit',
          creditsRemaining: Math.max(0, credits.credits_remaining - 1),
          email: credits.email,
        };
      } else {
        return res.status(200).json({
          status: 'no_credits',
          creditsRemaining: 0,
        });
      }
    }

    const sourceImageBuffer = await fetchBuffer(parsed.data.imageUrl);
    const rotated = sharp(sourceImageBuffer).rotate();
    const { data: normalizedOriginal, info } = await rotated.toBuffer({ resolveWithObject: true });
    const contentType =
      info.format === 'jpeg'
        ? 'image/jpeg'
        : info.format === 'png'
          ? 'image/png'
          : `image/${info.format}`;
    await overwriteBlob(parsed.data.imageUrl, normalizedOriginal, blobToken, contentType);
    const normalizedForReplicate = await sharp(normalizedOriginal).png().toBuffer();
    const prediction = await createPrediction({
      token: replicateToken,
      version: replicateVersion,
      model: replicateModel,
      imageBuffer: normalizedForReplicate,
      blobToken,
      prompt: parsed.data.options?.prompt ?? DEFAULT_PROMPT,
    });

    const lineArtSource = await waitForPrediction(prediction.id, replicateToken);
    const stored = await saveImageToBlob(lineArtSource, blobToken);

    const requestedSetSize = parsed.data.options?.setSize;
    const setSize: FcSetSize =
      requestedSetSize && FC_SET_SIZES.includes(requestedSetSize as FcSetSize)
        ? (requestedSetSize as FcSetSize)
        : 120;
    const paletteForSet = await getPalette(setSize);
    console.log('palette set size', setSize, 'first entries', paletteForSet.slice(0, 5));
    const sampledHexes = await safeExtractColors(normalizedOriginal, 12);
    console.log('sampledHexes:', sampledHexes);
    let paletteMatches;
    try {
      paletteMatches = await matchToFaberPalette(sampledHexes, 12, { palette: paletteForSet });
    } catch (error) {
      console.error('matchToFaberPalette failed', error);
      throw error;
    }
    const fallbackTips = buildTips(paletteMatches);
    const { tips: semanticTips, model: tipsModelName } = await generateSemanticTips(
      parsed.data.imageUrl,
      paletteForSet,
      paletteMatches,
    );
    const normalizedTips = ensureTipCoverage(semanticTips, fallbackTips);
    const enhanced = normalizedTips.length > 0 ? await enhanceTipColors(normalizedTips, paletteForSet) : null;
    const enrichedTips = mergeTipColors(normalizedTips, enhanced);
    const analysis = buildAnalysis({
      sourceImageUrl: parsed.data.imageUrl,
      matches: paletteMatches,
      model: replicateModel,
      version: replicateVersion,
      tipsOverride: enrichedTips,
      tipsModelName,
      setSize,
    });

    if (gateResult.status === 'ok' && gateResult.generationType && gateResult.generationType !== 'book') {
      const nowIso = new Date().toISOString();
      try {
        if (gateResult.generationType === 'free') {
          await updateCreditsByEmail(email, { free_used_at: nowIso, updated_at: nowIso });
        } else if (gateResult.generationType === 'credit') {
          await updateCreditsByEmail(email, {
            credits_remaining: gateResult.creditsRemaining ?? 0,
            updated_at: nowIso,
          });
        }
      } catch (updateError) {
        console.warn('Credits update failed after successful generation.', updateError);
      }
    }

    return res.status(200).json({
      status: 'ok',
      generationType: gateResult.generationType,
      creditsRemaining: gateResult.creditsRemaining,
      lineArtUrl: stored,
      analysis,
    });
  } catch (error) {
    console.error('AI line art failed', error);
    const message = error instanceof Error ? error.message : 'Prediction failed';
    return sendError(res, 500, ERROR_CODES.REPLICATE_FAILED, message);
  }
}

async function createPrediction(params: {
  token: string;
  version: string;
  model: string;
  imageBuffer: Buffer;
  prompt: string;
  blobToken: string;
}) {
  const uploadResult = await put(`replicate-inputs/${Date.now()}.png`, params.imageBuffer, {
    access: 'public',
    contentType: 'image/png',
    token: params.blobToken,
  });
  const response = await fetchWithRetry(
    () =>
      fetch(REPLICATE_API_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: params.version,
          input: {
            image_input: [uploadResult.url],
            prompt: params.prompt,
          },
        }),
      }),
    2,
    1000,
  );

  const prediction = (await response.json()) as ReplicatePrediction;
  return prediction;
}

async function waitForPrediction(id: string, token: string) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < REPLICATE_TIMEOUT_MS) {
    const status = await fetchWithRetry(
      () =>
        fetch(`${REPLICATE_API_BASE}/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      2,
      800,
    );
    const payload = (await status.json()) as ReplicatePrediction;
    if (payload.status === 'succeeded') {
      const url = extractOutputUrl(payload.output);
      if (!url) {
        throw new Error('Replicate succeeded but no output URL provided');
      }
      return url;
    }
    if (payload.status === 'failed') {
      throw new Error(payload.error ?? 'Replicate failed');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Replicate prediction timed out');
}

function extractOutputUrl(output?: string[] | string) {
  if (!output) {
    return null;
  }
  if (Array.isArray(output)) {
    return output[0] ?? null;
  }
  return output;
}

async function saveImageToBlob(sourceUrl: string, token: string) {
  const buffer = await fetchBuffer(sourceUrl);
  const contentType = detectContentType(sourceUrl) ?? 'image/png';
  const extension = contentType.includes('png') ? '.png' : '.jpg';
  const pathname = `line-art/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${randomUUID()}${extension}`;

  const stored = await put(pathname, buffer, {
    access: 'public',
    contentType,
    token,
  });

  return stored.url;
}

async function overwriteBlob(url: string, buffer: Buffer, token: string, contentType: string) {
  const path = new URL(url).pathname.slice(1);
  await put(path, buffer, {
    access: 'public',
    contentType,
    token,
    allowOverwrite: true,
  });
}

async function fetchBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function safeExtractColors(buffer: Buffer, count = 12) {
  try {
    return await extractDominantHexColors(buffer, count);
  } catch (error) {
    console.warn('Color extraction failed', error);
    return ['#333333', '#777777', '#BBBBBB'];
  }
}

function detectContentType(url: string) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

function dedupePaletteFromTips(tips: ColorTip[]) {
  const map = new Map<string, { fcNo: string; fcName: string; hex: string }>();
  tips.forEach((tip) => {
    if (!map.has(tip.fcNo)) {
      map.set(tip.fcNo, { fcNo: tip.fcNo, fcName: tip.fcName, hex: tip.hex });
    }
  });
  return Array.from(map.values());
}

function buildAnalysis({
  sourceImageUrl,
  matches,
  model,
  version,
  tipsOverride,
  tipsModelName,
  setSize,
}: {
  sourceImageUrl: string;
  matches: Awaited<ReturnType<typeof matchToFaberPalette>>;
  model: string;
  version: string;
  tipsOverride?: ColorTip[];
  tipsModelName?: string;
  setSize: FcSetSize;
}) {
  const paletteFromMatches = matches.map((match) => ({
    fcNo: match.color.fcNo,
    fcName: match.color.fcName,
    hex: match.color.hex,
  }));

  const useSemanticTips = tipsOverride && tipsOverride.length > 0;
  const tips = useSemanticTips ? tipsOverride : buildTips(matches);
  const paletteFromTips =
    useSemanticTips && tipsOverride ? dedupePaletteFromTips(tipsOverride) : [];
  const palette = ensurePaletteCoverage(paletteFromTips, paletteFromMatches);

  return {
    sourceImageUrl,
    palette,
    tips,
    model: { name: model, version },
    paletteSetSize: setSize,
    tipsModel: tipsOverride?.length
      ? { name: tipsModelName ?? 'openai/gpt-4o-mini', version: 'latest' }
      : undefined,
  };
}

function ensureTipCoverage(preferred: ColorTip[], fallback: ColorTip[]) {
  if (preferred.length === 0 && fallback.length === 0) {
    return [];
  }
  const unique: ColorTip[] = [];
  const seen = new Set<string>();
  const pushUnique = (tip: ColorTip) => {
    const key = `${tip.region}-${tip.fcNo}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    unique.push(tip);
  };
  preferred.forEach((tip) => {
    if (unique.length >= MAX_TIP_COUNT) {
      return;
    }
    pushUnique(tip);
  });
  if (unique.length < MIN_TIP_COUNT) {
    for (const tip of fallback) {
      if (unique.length >= MIN_TIP_COUNT) {
        break;
      }
      pushUnique(tip);
    }
  }
  return unique.slice(0, Math.min(MAX_TIP_COUNT, unique.length));
}

function mergeTipColors(
  baseTips: ColorTip[],
  enhanced?: Array<{ region: string; colors?: Array<{ fcNo: string; fcName: string; hex: string }> }> | null,
) {
  if (!enhanced || enhanced.length === 0) {
    return baseTips;
  }
  return baseTips.map((tip) => {
    const match = enhanced.find((entry) => entry.region === tip.region);
    if (match?.colors) {
      return {
        ...tip,
        colors: match.colors,
      };
    }
    return tip;
  });
}

function ensurePaletteCoverage(
  primary: Array<{ fcNo: string; fcName: string; hex: string }>,
  fallback: Array<{ fcNo: string; fcName: string; hex: string }>,
) {
  const merged: Array<{ fcNo: string; fcName: string; hex: string }> = [];
  const push = (entry: { fcNo: string; fcName: string; hex: string }) => {
    if (merged.find((existing) => existing.fcNo === entry.fcNo)) {
      return;
    }
    merged.push(entry);
  };
  primary.forEach(push);
  if (merged.length < MIN_PALETTE_SIZE) {
    fallback.forEach((entry) => {
      if (merged.length >= MIN_PALETTE_SIZE) {
        return;
      }
      push(entry);
    });
  }
  fallback.forEach((entry) => {
    if (merged.length >= MAX_PALETTE_SIZE) {
      return;
    }
    push(entry);
  });
  return merged.slice(0, Math.min(MAX_PALETTE_SIZE, merged.length));
}

async function fetchWithRetry(
  fn: () => Promise<Response>,
  retries = 1,
  delayMs = 500,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fn();
      if (!res.ok) {
        // retry only on 5xx
        if (res.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        const message = await res.text();
        throw new Error(message || `Request failed with status ${res.status}`);
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
