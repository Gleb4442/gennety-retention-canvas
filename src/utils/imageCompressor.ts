/**
 * Client-side image compression and loading utilities for Gennety Canvas.
 * Keeps image payloads lightweight (100-300KB) for seamless localStorage,
 * snappy JSON backups, and responsive rendering.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 1400,
  quality = 0.85
): Promise<string> {
  // SVGs don't need raster compression
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Downscale proportionally if needed
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Keep small PNGs transparent; convert large or opaque photos to WebP / JPEG
        const isSmallPng = file.type === 'image/png' && file.size < 400000;
        const mime = isSmallPng ? 'image/png' : 'image/webp';
        
        try {
          const dataUrl = canvas.toDataURL(mime, quality);
          resolve(dataUrl);
        } catch {
          // Fallback to jpeg
          const fallbackUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(fallbackUrl);
        }
      };

      img.onerror = () => {
        // If image object fails to decode, return the raw data URL
        resolve(e.target?.result as string);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validates whether an image URL is reachable and decodable.
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
