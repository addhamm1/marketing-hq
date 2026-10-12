import type Phaser from "phaser";

import type { BubbleKind, Prop } from "./life/plan";
import { canvasTexture, px } from "./textures";

/**
 * Pixel art for what characters are doing: speech-bubble icons and small
 * hand-held props. Drawn once per game into canvas textures, so emoji fonts
 * never matter and every platform shows the same pixels.
 */

const COLORS: Record<string, string> = {
  k: "#040707", // Espaces black
  c: "#2A2A29", // charcoal
  y: "#F7D139", // Espaces yellow
  o: "#FAA41A", // orange
  r: "#D62C27", // red
  t: "#2D6372", // teal
  s: "#EBE6DD", // warm stone
  w: "#ffffff",
  b: "#7b4f31", // coffee
  g: "#8a949b",
};

/** 8x6 icons, one character per pixel ("." is transparent). */
const ICONS: Record<BubbleKind, string[]> = {
  chat: ["........", "........", "kk.kk.kk", "kk.kk.kk", "........", "........"],
  laugh: ["..yyyy..", ".ykyyky.", "yyyyyyyy", "ykyyyyky", ".ykkkky.", "..yyyy.."],
  coffee: ["..g.g...", "...g.g..", "kbbbbk..", "kwwwwkkk", "kooookk.", ".kkkk..."],
  idea: ["..yyyy..", ".yywyyy.", ".yyyyyy.", "..yyyy..", "..kkkk..", "...kk..."],
  heart: [".rr..rr.", "rrrrrrrr", "rrrrrrrr", ".rrrrrr.", "..rrrr..", "...rr..."],
  music: ["...ttttt", "...t...t", "...t...t", ".ttt.ttt", ".ttt.ttt", "........"],
  zzz: ["cccc....", "..c.....", ".c..ccc.", "cccc..c.", ".....c..", "....ccc."],
  phone: ["..kkkk.o", "..kttk..", "..kttko.", "..kttk..", "..kttk.o", "..kkkk.."],
  camera: ["...kk...", "kkkkkkkr", "kgkwwkgk", "kkwttwkk", "kkkwwkkk", "kkkkkkkk"],
};

const PROPS: Record<Prop, string[]> = {
  coffee: ["kkkk.", "kwwkk", "koook", "kwwk.", ".kk.."],
  phone: ["kkk", "ktk", "ktk", "ktk", "kkk"],
  camera: [".kk....", "kkkkkkr", "kgwwgkk", "kgwwgkk", "kkkkkkk"],
};

export const BUBBLE_W = 14;
export const BUBBLE_H = 12;

export function bubbleKey(kind: BubbleKind): string {
  return `pixel:bubble:${kind}`;
}

export function propKey(prop: Prop): string {
  return `pixel:prop:${prop}`;
}

function drawRows(ctx: CanvasRenderingContext2D, rows: string[], ox: number, oy: number): void {
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const color = COLORS[ch];
      if (color) px(ctx, color, ox + x, oy + y);
    }),
  );
}

export function ensureActivityTextures(scene: Phaser.Scene): void {
  for (const [kind, rows] of Object.entries(ICONS) as [BubbleKind, string[]][]) {
    canvasTexture(scene, bubbleKey(kind), BUBBLE_W, BUBBLE_H, (ctx) => {
      // White speech bubble with a black pixel outline and a tail at the bottom left.
      px(ctx, "#040707", 1, 0, BUBBLE_W - 2, 10);
      px(ctx, "#040707", 0, 1, BUBBLE_W, 8);
      px(ctx, "#ffffff", 1, 1, BUBBLE_W - 2, 8);
      px(ctx, "#040707", 3, 10, 3, 1);
      px(ctx, "#040707", 3, 11, 1, 1);
      px(ctx, "#ffffff", 4, 9, 1, 1);
      drawRows(ctx, rows, 3, 2);
    });
  }
  for (const [prop, rows] of Object.entries(PROPS) as [Prop, string[]][]) {
    canvasTexture(scene, propKey(prop), rows[0].length, rows.length, (ctx) => drawRows(ctx, rows, 0, 0));
  }
}
