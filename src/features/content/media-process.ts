"use client";

import { putResumable } from "@/lib/uploads/transport";

export { probe, type Probe } from "@/lib/uploads/probe";

/** Resumable upload (TUS, 6 MB chunks) into post-media; used for files over 6 MB. */
export function uploadResumable(file: File, path: string, onProgress: (pct: number) => void): Promise<void> {
  return putResumable({ bucket: "post-media", path }, file, onProgress);
}

/** Aspect-ratio warning: horizontal media on vertical formats, vertical on feed. */
export function aspectIssue(format: string, width: number | null, height: number | null): "horizontal" | "vertical" | null {
  if (!width || !height) return null;
  const r = width / height;
  if ((format === "reel" || format === "story") && r > 0.8) return r > 1.05 ? "horizontal" : null;
  if (format === "feed" || format === "carousel") return r < 0.75 ? "vertical" : null;
  return null;
}
