"use client";

export type Probe = { width: number | null; height: number | null; duration: number | null; thumb: Blob | null };

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8));
}

function drawScaled(source: CanvasImageSource, w: number, h: number, max = 480) {
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Image: size + a resized copy as thumbnail. */
async function probeImage(file: File): Promise<Probe> {
  const bitmap = await createImageBitmap(file);
  const thumb = await canvasBlob(drawScaled(bitmap, bitmap.width, bitmap.height));
  const out = { width: bitmap.width, height: bitmap.height, duration: null, thumb };
  bitmap.close();
  return out;
}

/** Video: size, duration and a frame from the first second (video element + canvas). */
function probeVideo(file: File): Promise<Probe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const done = (p: Probe) => {
      URL.revokeObjectURL(url);
      resolve(p);
    };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 1) / 2);
    };
    video.onseeked = async () => {
      const thumb = await canvasBlob(drawScaled(video, video.videoWidth, video.videoHeight));
      done({ width: video.videoWidth || null, height: video.videoHeight || null, duration: Number.isFinite(video.duration) ? video.duration : null, thumb });
    };
    video.onerror = () => done({ width: null, height: null, duration: null, thumb: null });
    video.src = url;
  });
}

export function probe(file: File): Promise<Probe> {
  return file.type.startsWith("video/") ? probeVideo(file) : probeImage(file);
}

/** Object URL of a small preview (image thumbnail or video poster), or null for other files. */
export async function previewUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return null;
  try {
    const { thumb } = await probe(file);
    return thumb ? URL.createObjectURL(thumb) : null;
  } catch {
    return null;
  }
}
