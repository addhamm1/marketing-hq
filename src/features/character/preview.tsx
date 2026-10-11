"use client";

import { useEffect, useRef } from "react";
import type { SpriteManifest } from "@/game/avatar/types";

/** Big rotating preview: cycles directions, plays the idle frames from the composed sheet. */
export function CharacterPreview({ sheet, manifest, scale = 7 }: { sheet: HTMLCanvasElement | null; manifest: SpriteManifest | null; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !sheet || !manifest) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { frameWidth: w, frameHeight: h } = manifest;
    let tick = 0;
    const draw = () => {
      const dir = Math.floor(tick / 6) % manifest.directions.length;
      const frame = manifest.animations.idle.frames[tick % manifest.animations.idle.frames.length];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, frame * w, dir * h, w, h, 0, 0, w * scale, h * scale);
      tick++;
    };
    draw();
    const i = setInterval(draw, 350);
    return () => clearInterval(i);
  }, [sheet, manifest, scale]);
  const size = (manifest?.frameWidth ?? 32) * scale;
  return <canvas ref={ref} width={size} height={size} className="pixelated" aria-hidden />;
}
