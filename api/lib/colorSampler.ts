import sharp from 'sharp';

function toHex(value: number) {
  return value.toString(16).padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export async function extractDominantHexColors(
  buffer: Buffer,
  count = 12,
): Promise<string[]> {
  const { data, info } = await sharp(buffer)
    .resize(96, 96, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, number>();

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (r > 245 && g > 245 && b > 245) {
      continue;
    }
    if (r < 10 && g < 10 && b < 10) {
      continue;
    }
    const bucketKey = `${Math.round(r / 8) * 8}-${Math.round(g / 8) * 8}-${Math.round(b / 8) * 8}`;
    buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
  }

  const sorted = Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);

  return sorted.map(([key]) => {
    const [r, g, b] = key.split('-').map((value) => Number.parseInt(value, 10));
    return rgbToHex(r, g, b);
  });
}
