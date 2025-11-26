import type { ColorTip, MatchResult } from './colorMatcher.js';
import type { PaletteColor } from './palette.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_KEY;
const OPENAI_MODEL = process.env.OPENAI_TIPS_MODEL ?? 'gpt-4o';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

interface RawTip {
  region?: string;
  tip?: string;
  fcNo?: string;
  fcName?: string;
  hex?: string;
}

const FEW_SHOT_EXAMPLE = `
Example tips (structure + tone):
[
  { "region": "Car body panels", "tip": "Lay down Deep Scarlet Red (FC 219) for the nose and sidepods, then deepen the shadowed seams with Dark Red (FC 225) while leaving thin white highlights along the top edges.", "fcNo": "219", "fcName": "Deep Scarlet Red", "hex": "#9B1B30" },
  { "region": "Upper body highlights", "tip": "Keep the spine and cockpit surround nearly white with FC 101, glazing a whisper of Cool Grey I (FC 230) near the edges so the red transitions smoothly.", "fcNo": "101", "fcName": "White", "hex": "#FFFFFF" },
  { "region": "Carbon wings & aero bits", "tip": "Use Cold Grey V (FC 234) on the front and rear wings, then press Black (FC 199) into the deepest recesses to make the aero pieces feel metallic.", "fcNo": "234", "fcName": "Cold Grey V", "hex": "#7F878C" },
  { "region": "Tires", "tip": "Fill the tires with Black (FC 199) using circular strokes, and burnish a thin strip of Warm Grey IV (FC 273) on the upper sidewalls for a glossy highlight.", "fcNo": "199", "fcName": "Black", "hex": "#0F0F0F" },
  { "region": "Driver helmet visor", "tip": "Blend Orange Glaze (FC 113) through Scarlet Red (FC 118) across the visor to mimic the fiery reflection, edging the top with Black (FC 199) for contrast.", "fcNo": "113", "fcName": "Orange Glaze", "hex": "#F26A1B" },
  { "region": "Race track asphalt", "tip": "Cover the tarmac with Cold Grey IV (FC 233) and darken the area beneath the car with Cold Grey VI (FC 235) to sell the shadow.", "fcNo": "233", "fcName": "Cold Grey IV", "hex": "#8E9498" },
  { "region": "Curbs", "tip": "Alternate Scarlet Red (FC 118) and White (FC 101) on the curb blocks, then shade the far edges with Warm Grey III (FC 272) so they sit on the ground.", "fcNo": "118", "fcName": "Scarlet Red", "hex": "#D72125" },
  { "region": "Background haze / sky", "tip": "Softly apply Light Flesh (FC 132) mixed with Warm Grey II (FC 271) across the horizon to capture the warm sunset glow.", "fcNo": "132", "fcName": "Light Flesh", "hex": "#F3C7A0" }
]`;

export async function generateSemanticTips(
  imageUrl: string,
  palette: PaletteColor[],
  matches: MatchResult[],
): Promise<{ tips: ColorTip[]; model?: string }> {
  if (!OPENAI_API_KEY || matches.length === 0) {
    return { tips: [] };
  }

  try {
    const paletteSummary = palette
      .map((entry) => `- FC ${entry.fcNo}: ${entry.fcName} (${entry.hex})`)
      .join('\n');

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a coloring book art director. Inspect the provided photo and describe recognizable objects or regions (e.g., “boat reflection,” “wooden rail,” “cloud highlights”). Produce between six and eight tips when the scene supports it (fewer only if absolutely necessary). Cover both large dominant areas (3-5 tips) and high-contrast accents/details (2-3 tips) even if they occupy smaller space (e.g., red bodywork, clothing, flowers). Each tip must reference exactly one pencil from the supplied palette (matching FC number and name) and describe how to apply it (layering, blending, pressure). Do NOT mention hex codes or swatch numbers in the prose. Return JSON: { "tips": [{ "region": "...", "tip": "...", "fcNo": "...", "fcName": "...", "hex": "..." }] }. Use this example as guidance:\n' +
              FEW_SHOT_EXAMPLE,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `You have access to ${palette.length} pencils from the Faber-Castell Polychromos set. Palette:\n` +
                  paletteSummary +
                  '\nSelect up to 12 pencils from this list and describe human-recognizable regions (not color swatches) to color the full image. Mention the chosen pencil explicitly (FC name + number) and keep each tip to 1-2 sentences. Provide 6-8 tips when possible, ensuring at least one covers each major color family you observe (skin, foliage, water, sky, clothing, accents, shadows, highlights). Treat this as coloring the full-color reference photo, not shading the line art.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${text}`);
    }

    const completion = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return { tips: [] };
    }

    const parsed = parseJson(content);
    const normalized = normalizeTips(parsed?.tips, palette, matches);
    return { tips: normalized, model: OPENAI_MODEL };
  } catch (error) {
    console.warn('Failed to generate semantic tips', error);
    return { tips: [] };
  }
}

function parseJson(content: string) {
  try {
    return JSON.parse(content) as { tips?: RawTip[] };
  } catch {
    return null;
  }
}

function normalizeTips(
  raw: RawTip[] | undefined,
  palette: PaletteColor[],
  matches: MatchResult[],
): ColorTip[] {
  if (!raw) {
    return [];
  }
  return raw
    .map((entry) => {
      if (!entry.region || !entry.tip) {
        return null;
      }
      const normalized = findMatchingColor(entry, palette, matches);
      if (!normalized) {
        return null;
      }
      return {
        region: entry.region.trim(),
        fcNo: normalized.fcNo,
        fcName: normalized.fcName,
        hex: normalized.hex,
        tip: entry.tip.trim(),
      };
    })
    .filter((tip): tip is ColorTip => Boolean(tip))
    .slice(0, 8);
}

function findMatchingColor(
  entry: RawTip,
  palette: PaletteColor[],
  matches: MatchResult[],
) {
  if (entry.fcNo) {
    const normalized = entry.fcNo.toString().trim();
    const direct = palette.find((color) => color.fcNo === normalized);
    if (direct) {
      return direct;
    }
  }
  if (entry.fcName) {
    const targetName = entry.fcName.toLowerCase();
    const byName = palette.find(
      (color) => color.fcName.toLowerCase() === targetName,
    );
    if (byName) {
      return byName;
    }
  }
  if (entry.hex) {
    const normalizedHex = entry.hex.toLowerCase();
    const byHex = palette.find((color) => color.hex.toLowerCase() === normalizedHex);
    if (byHex) {
      return byHex;
    }
  }
  const match = matches[0];
  if (match) {
    return match.color;
  }
  return palette[0];
}
