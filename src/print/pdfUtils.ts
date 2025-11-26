export interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

export async function fetchImageAsDataUrl(url: string): Promise<LoadedImage> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to load image (${response.status})`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolveWithMeta(dataUrl).then(resolve).catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function resolveWithMeta(dataUrl: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        dataUrl,
        width: image.width,
        height: image.height,
      });
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}

export function slugifyFileName(name: string, suffix: string) {
  const base = name.replace(/\.[^.]+$/, '');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'line-art'}-${suffix}`;
}
