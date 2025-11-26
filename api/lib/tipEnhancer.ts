import type { PaletteColor } from './palette.js';
import type { ColorTip } from './colorMatcher.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_KEY;
const OPENAI_MODEL = process.env.OPENAI_TIPS_MODEL ?? 'gpt-4o-mini';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

interface EnhancedTip {
  region: string;
  tip: string;
  colors: Array<{
    fcNo: string;
    fcName: string;
    hex: string;
  }>;
}

interface EnhancementResponse {
  tips?: EnhancedTip[];
}

export async function enhanceTipColors(tips: ColorTip[], palette: PaletteColor[]) {
  if (!OPENAI_API_KEY || tips.length === 0) {
    return null;
  }

  try {
    const paletteSummary = palette
      .map((entry) => `FC ${entry.fcNo}: ${entry.fcName} (${entry.hex})`)
      .join('\n');
    const tipSummary = tips
      .map((tip) => `Region: ${tip.region}\nInstruction: ${tip.tip}`)
      .join('\n---\n');

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
              'Extract every Faber-Castell pencil referenced in each tip. Each tip should return a "colors" array listing every pencil (FC number, name, and hex) needed for that tip. Do not invent pencils that are not in the palette list. Return JSON { "tips": [{ "region": "...", "colors": [{ "fcNo": "...", "fcName": "...", "hex": "..." }] }] } and keep regions identical to the input.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `Palette list:\n${paletteSummary}\n---\nTips to analyze:\n${tipSummary}\nReturn one object per tip with all pencils mentioned.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }
    const parsed = JSON.parse(content) as EnhancementResponse;
    return parsed.tips ?? null;
  } catch (error) {
    console.warn('Failed to enhance tips', error);
    return null;
  }
}
