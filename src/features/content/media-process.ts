"use client";

import * as tus from "tus-js-client";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";

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

/** Resumable upload (TUS, 6 MB chunks) into post-media; used for files over 6 MB. */
export async function uploadResumable(file: File, path: string, onProgress: (pct: number) => void): Promise<void> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("no session");
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${env.supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: { bucketName: "post-media", objectName: path, contentType: file.type || "application/octet-stream", cacheControl: "3600" },
      onError: reject,
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

/** Aspect-ratio warning: horizontal media on vertical formats, vertical on feed. */
export function aspectIssue(format: string, width: number | null, height: number | null): "horizontal" | "vertical" | null {
  if (!width || !height) return null;
  const r = width / height;
  if ((format === "reel" || format === "story") && r > 0.8) return r > 1.05 ? "horizontal" : null;
  if (format === "feed" || format === "carousel") return r < 0.75 ? "vertical" : null;
  return null;
}
