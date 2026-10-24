// Fotoğrafları yüklemeden önce istemcide küçültüp sıkıştırır.
// Araç ve evrak fotoğrafları max 300KB (proje kuralı).

export const VEHICLE_PHOTO_MAX_BYTES = 300 * 1024;
export const DOCUMENT_PHOTO_MAX_BYTES = 300 * 1024;
export const THUMBNAIL_MAX_BYTES = 50 * 1024;
export const THUMBNAIL_MAX_DIM = 400;

interface ResizeOptions {
  maxBytes: number;
  maxDimension?: number; // en uzun kenar (px)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function fitDimensions(w: number, h: number, maxDim: number) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w > h ? maxDim / w : maxDim / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function toBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Sıkıştırma başarısız"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Hedef bayt altına inene kadar önce kaliteyi, sonra boyutu kademeli düşürür.
 * Her zaman JPEG döner.
 */
export async function resizeImage(
  file: File,
  { maxBytes, maxDimension = 1600 }: ResizeOptions,
): Promise<Blob> {
  const img = await loadImage(file);
  let { width, height } = fitDimensions(img.width, img.height, maxDimension);
  let quality = 0.9;
  let blob = await toBlob(img, width, height, quality);

  // 1) Kaliteyi düşür
  while (blob.size > maxBytes && quality > 0.4) {
    quality = Math.round((quality - 0.1) * 10) / 10;
    blob = await toBlob(img, width, height, quality);
  }
  // 2) Hâlâ büyükse boyutu düşür
  while (blob.size > maxBytes && Math.max(width, height) > 400) {
    width = Math.round(width * 0.85);
    height = Math.round(height * 0.85);
    quality = 0.8;
    blob = await toBlob(img, width, height, quality);
  }
  return blob;
}

/**
 * Aynı dosyadan tam görsel + düşük çözünürlüklü thumbnail üretir.
 * Thumbnail liste/kartlarda kullanılır (hızlı), tam görsel detayda.
 */
export async function resizeWithThumbnail(
  file: File,
  fullMaxBytes: number,
): Promise<{ full: Blob; thumb: Blob }> {
  const [full, thumb] = await Promise.all([
    resizeImage(file, { maxBytes: fullMaxBytes }),
    resizeImage(file, { maxBytes: THUMBNAIL_MAX_BYTES, maxDimension: THUMBNAIL_MAX_DIM }),
  ]);
  return { full, thumb };
}
