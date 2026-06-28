import { MAX_IMAGE_SIZE_BYTES } from "@/lib/media/upload-constraints";

const MAX_EDGE = 1024;
const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58];

export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= MAX_IMAGE_SIZE_BYTES || typeof window === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mime = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  let best: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob) continue;
    best = blob;
    if (blob.size <= MAX_IMAGE_SIZE_BYTES) break;
  }

  if (!best || best.size >= file.size) return file;
  return new File([best], file.name, { type: best.type || file.type, lastModified: file.lastModified });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
