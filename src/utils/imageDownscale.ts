interface DownscaleOptions {
  maxBytes: number;
  maxDimension: number;
}

const DEFAULT_OPTIONS: DownscaleOptions = {
  maxBytes: 3_000_000,
  maxDimension: 3200,
};

const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/webp'];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('canvas.toBlob() produced an empty result'));
        }
      },
      type,
      quality,
    );
  });
}

export async function downscaleImageFile(
  file: File,
  options: DownscaleOptions = DEFAULT_OPTIONS,
): Promise<{ file: File; didChange: boolean }> {
  if (file.size <= options.maxBytes) {
    return { file, didChange: false };
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);

    const longestSide = Math.max(image.width, image.height);
    let scale = Math.min(1, options.maxDimension / longestSide);
    if (scale >= 1 && !COMPRESSIBLE_TYPES.includes(file.type)) {
      // Already within bounds and cannot be recompressed efficiently.
      return { file, didChange: false };
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return { file, didChange: false };
    }

    let quality = COMPRESSIBLE_TYPES.includes(file.type) ? 0.92 : undefined;
    let attempts = 0;
    let blob: Blob;

    do {
      const targetWidth = Math.max(1, Math.floor(image.width * scale));
      const targetHeight = Math.max(1, Math.floor(image.height * scale));
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.clearRect(0, 0, targetWidth, targetHeight);
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      blob = await canvasToBlob(canvas, file.type || 'image/jpeg', quality);
      if (blob.size <= options.maxBytes) {
        break;
      }

      attempts += 1;
      scale *= 0.85;
      if (quality) {
        quality = Math.max(0.6, quality - 0.1);
      }
    } while (attempts < 5);

    if (blob.size > options.maxBytes) {
      // Fall back to original to avoid blocking user.
      return { file, didChange: false };
    }

    const preparedFile = new File([blob], file.name, {
      type: blob.type || file.type,
      lastModified: Date.now(),
    });
    return { file: preparedFile, didChange: true };
  } catch (error) {
    console.error('Failed to downscale image', error);
    return { file, didChange: false };
  }
}
