import type Phaser from "phaser";

import type { CharacterStatus } from "./types";

/** Small shared textures generated once per game: status bubbles, leave sign, shadow, fallback character. */

export const STATUS_COLORS: Record<CharacterStatus, string> = {
  available: "#22a565",
  focus: "#7c5cd6",
  meeting: "#2f7fd8",
  shoot: "#d9534f",
  break: "#e39b2d",
  away: "#8a949b",
};

/** 5x5 pixel icons drawn in white on the bubble. */
const STATUS_ICONS: Record<CharacterStatus, string[]> = {
  available: ["....#", "...#.", "#.#..", ".#...", "....."],
  focus: [".###.", "#...#", "#.#.#", "#...#", ".###."],
  meeting: ["#...#", ".....", "##.##", "##.##", "....."],
  shoot: [".##..", "#####", "##.##", "#####", "....."],
  break: [".#.#.", ".....", "####.", "#####", "####."],
  away: ["####.", "..#..", ".#...", "####.", "....."],
};

export const SHADOW_KEY = "pixel:shadow";
export const LEAVE_SIGN_KEY = "pixel:leave-sign";

export function statusKey(status: CharacterStatus): string {
  return `pixel:status:${status}`;
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function ensureSharedTextures(scene: Phaser.Scene): void {
  for (const status of Object.keys(STATUS_ICONS) as CharacterStatus[]) {
    canvasTexture(scene, statusKey(status), 11, 11, (ctx) => {
      const c = STATUS_COLORS[status];
      px(ctx, "#13232c", 1, 0, 9, 9); // outline
      px(ctx, "#13232c", 0, 1, 11, 7);
      px(ctx, c, 1, 1, 9, 7);
      px(ctx, "#13232c", 4, 9, 3, 1); // tail
      px(ctx, "#13232c", 5, 10, 1, 1);
      px(ctx, c, 5, 9, 1, 1);
      STATUS_ICONS[status].forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && px(ctx, "#ffffff", 3 + x, 2 + y)));
    });
  }
  canvasTexture(scene, SHADOW_KEY, 14, 4, (ctx) => {
    px(ctx, "rgba(11,26,33,0.28)", 2, 0, 10, 4);
    px(ctx, "rgba(11,26,33,0.28)", 0, 1, 2, 2);
    px(ctx, "rgba(11,26,33,0.28)", 12, 1, 2, 2);
  });
  // A little sign on a post with a palm tree: "out of office", no text to translate.
  canvasTexture(scene, LEAVE_SIGN_KEY, 16, 18, (ctx) => {
    px(ctx, "#7b4f31", 7, 10, 2, 8);
    px(ctx, "#13232c", 0, 0, 16, 11);
    px(ctx, "#efe6d6", 1, 1, 14, 9);
    px(ctx, "#b9dde4", 2, 2, 12, 5);
    px(ctx, "#d3c09c", 2, 7, 12, 2);
    px(ctx, "#7b4f31", 7, 4, 1, 4);
    px(ctx, "#4f8a5b", 5, 3, 5, 1);
    px(ctx, "#4f8a5b", 4, 4, 2, 1);
    px(ctx, "#4f8a5b", 9, 4, 2, 1);
    px(ctx, "#e3b04b", 11, 2, 2, 2);
  });
}

let fallback: HTMLCanvasElement | null = null;

/** Plain grey character used until the default avatar has been composed. */
export function fallbackSheet(frame = 32): HTMLCanvasElement {
  if (fallback) return fallback;
  const canvas = document.createElement("canvas");
  canvas.width = frame * 6;
  canvas.height = frame * 4;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const x = col * frame;
        const y = row * frame + (col % 2);
        px(ctx, "#0f4c5c", x + 10, y + 16, 12, 9);
        px(ctx, "#374151", x + 11, row * frame + 24, 10, 5);
        px(ctx, "#111827", x + 10, row * frame + 29, 12, 2);
        px(ctx, "#c68642", x + 10, y + 4, 12, 12);
        px(ctx, "#2b1b10", x + 10, y + 3, 12, row === 3 ? 10 : 4);
      }
    }
  }
  fallback = canvas;
  return canvas;
}
