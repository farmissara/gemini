export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  maxDataUrlLength?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const safeW = Number.isFinite(width) && width > 0 ? Math.round(width) : maxDimension;
  const safeH = Number.isFinite(height) && height > 0 ? Math.round(height) : maxDimension;
  const safeMax = Number.isFinite(maxDimension) && maxDimension > 0 ? Math.round(maxDimension) : 960;

  const largestSide = Math.max(safeW, safeH);
  if (largestSide <= safeMax) {
    return { width: safeW, height: safeH };
  }

  const scale = safeMax / largestSide;
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

function readFileAsRawDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read image file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

export function compressImageDataUrl(
  rawDataUrl: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const maxDimension = options.maxDimension ?? 960;
  const initialQuality = options.quality ?? 0.76;
  const maxDataUrlLength = options.maxDataUrlLength ?? 160_000;
  const mimeType = options.mimeType ?? 'image/jpeg';

  if (typeof document === 'undefined' || !rawDataUrl.startsWith('data:image/')) {
    return Promise.resolve(rawDataUrl);
  }
  // Keep vector SVGs untouched
  if (rawDataUrl.startsWith('data:image/svg+xml')) {
    return Promise.resolve(rawDataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const { width, height } = computeScaledDimensions(img.width || maxDimension, img.height || maxDimension, maxDimension);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = initialQuality;
        let output = canvas.toDataURL(mimeType, quality);

        while (output.length > maxDataUrlLength && quality > 0.45) {
          quality = Math.max(0.42, Number((quality - 0.1).toFixed(2)));
          output = canvas.toDataURL(mimeType, quality);
        }

        resolve(output.length < rawDataUrl.length ? output : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function compressImageFileToDataUrl(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const rawDataUrl = await readFileAsRawDataUrl(file);
  return compressImageDataUrl(rawDataUrl, options);
}

export async function compressImageFileToBlob(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<{ blob: Blob; contentType: string }> {
  const maxDimension = options.maxDimension ?? 512;
  const quality = options.quality ?? 0.82;
  const targetMime = options.mimeType ?? (file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');

  if (typeof document === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return { blob: file, contentType: file.type || 'application/octet-stream' };
  }

  try {
    const rawDataUrl = await readFileAsRawDataUrl(file);
    const compressedDataUrl = await compressImageDataUrl(rawDataUrl, {
      maxDimension,
      quality,
      maxDataUrlLength: options.maxDataUrlLength ?? 180_000,
      mimeType: targetMime,
    });
    if (compressedDataUrl === rawDataUrl) {
      return { blob: file, contentType: file.type || targetMime };
    }
    const blob = await (await fetch(compressedDataUrl)).blob();
    if (blob.size >= file.size) {
      return { blob: file, contentType: file.type || targetMime };
    }
    return { blob, contentType: blob.type || targetMime };
  } catch {
    return { blob: file, contentType: file.type || 'image/jpeg' };
  }
}
