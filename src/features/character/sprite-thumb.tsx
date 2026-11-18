"use client";

import { useEffect, useRef } from "react";
import { configHash } from "@/game/avatar/config";
import { renderPreviewSheet } from "@/game/avatar/compositor";
import type { AvatarConfig, LayerKey, SpriteManifest } from "@/game/avatar/types";
import { cn } from "@/lib/utils";

/** The part of the front-facing frame each category zooms into: x, y, size. */
const VIEWPORTS: Record<LayerKey | "all", readonly [number, number, number]> = {
  all: [0, 0, 32],
  body: [4, 2, 26],
  hair: [5, 0, 22],
  facial_hair: [9, 8, 14],
  headwear: [5, 0, 22],
  glasses: [9, 5, 14],
  top: [6, 14, 20],
  bottom: [7, 16, 16],
  shoes: [9, 18, 14],
  accessory: [0, 0, 32],
};

/** A crop of the real composed sprite, so a thumbnail always matches what is worn. */
export function SpriteThumb({ config, manifest, view, className }: {
  config: AvatarConfig;
  manifest: SpriteManifest;
  view: LayerKey | "all";
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hash = configHash(config);

  useEffect(() => {
    let alive = true;
    renderPreviewSheet(config, manifest)
      .then((sheet) => {
        const ctx = ref.current?.getContext("2d");
        if (!alive || !ctx) return;
        const [x, y, size] = VIEWPORTS[view];
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(sheet, x, y, size, size, 0, 0, 64, 64);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // The hash stands in for the config object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, manifest, view]);

  return <canvas ref={ref} width={64} height={64} aria-hidden className={cn("pixelated size-14", className)} />;
}
