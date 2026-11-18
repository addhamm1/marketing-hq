"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { configHash } from "@/game/avatar/config";
import { renderSheet } from "@/game/avatar/compositor";
import type { AvatarConfig, Direction, SpriteManifest } from "@/game/avatar/types";

const TURN_ORDER: Direction[] = ["down", "left", "up", "right"];
const STEPS_PER_DIRECTION = 16;
const SCALE = 5;
const SIZE = 48 * SCALE;
const TILE = 12 * SCALE;
const FLOOR = ["#ebe6dd", "#e2dbcd"];
const DRIFT: Record<Direction, readonly [number, number]> = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] };

function drawFloor(ctx: CanvasRenderingContext2D, dir: Direction, tick: number): void {
  const [dx, dy] = DRIFT[dir];
  const offset = (tick * SCALE) % (TILE * 2);
  for (let y = -2; y < 7; y++) {
    for (let x = -2; x < 7; x++) {
      ctx.fillStyle = FLOOR[(x + y + 40) % 2];
      ctx.fillRect(x * TILE + dx * offset, y * TILE + dy * offset, TILE, TILE);
    }
  }
}

/** The character walking on a small floor, turning through all four directions. */
export function Stage({ config, manifest }: { config: AvatarConfig; manifest: SpriteManifest }) {
  const t = useTranslations("character");
  const canvas = useRef<HTMLCanvasElement>(null);
  const sheet = useRef<HTMLCanvasElement | null>(null);
  const turn = useRef(0);
  const [reduced, setReduced] = useState(false);
  const hash = configHash(config);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let alive = true;
    renderSheet(config, manifest)
      .then((s) => {
        if (!alive) return;
        sheet.current = s;
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          canvas.current?.animate(
            [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }, { transform: "translateY(0)" }],
            { duration: 220, easing: "ease-out" },
          );
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // The hash stands in for the config object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, manifest]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const { frameWidth: w, frameHeight: h, animations } = manifest;
    let tick = 0;
    const draw = () => {
      const dir = TURN_ORDER[turn.current % TURN_ORDER.length];
      ctx.imageSmoothingEnabled = false;
      drawFloor(ctx, dir, reduced ? 0 : tick);
      ctx.fillStyle = "rgba(42, 42, 41, 0.22)";
      ctx.fillRect(SIZE / 2 - 8 * SCALE, 39 * SCALE, 16 * SCALE, 2 * SCALE);
      if (sheet.current) {
        const frames = reduced ? animations.idle.frames : animations.walk.frames;
        const frame = frames[reduced ? 0 : tick % frames.length];
        const row = Math.max(0, manifest.directions.indexOf(dir));
        ctx.drawImage(sheet.current, frame * w, row * h, w, h, 8 * SCALE, 10 * SCALE, w * SCALE, h * SCALE);
      }
      tick++;
      if (!reduced && tick % STEPS_PER_DIRECTION === 0) turn.current++;
    };
    draw();
    const timer = setInterval(draw, reduced ? 250 : 1000 / animations.walk.frameRate);
    return () => clearInterval(timer);
  }, [manifest, reduced]);

  return (
    <div className="relative mx-auto w-fit">
      <canvas
        ref={canvas}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={t("previewLabel")}
        data-testid="character-stage"
        className="pixelated size-36 rounded-xl border sm:size-52 lg:size-60"
      />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute end-1.5 bottom-1.5 size-10"
        aria-label={t("turn")}
        onClick={() => { turn.current++; }}
      >
        <RotateCw aria-hidden />
      </Button>
    </div>
  );
}
