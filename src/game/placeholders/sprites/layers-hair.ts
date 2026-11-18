import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, fitOf } from "./anatomy";
import { GREY, dots, fill, paintOver } from "./shader";

/** Short and medium hair (tinted with the hair colour). Long styles are in `layers-hair-long.ts`. */

export type HairShape = (m: Mask, ht: number, ctx: FrameCtx) => void;
export type HairFinish = (ht: number, ctx: FrameCtx, m: Mask) => void;

/** Soft shine across the crown, on the side the light comes from. */
export const crownShine: HairFinish = (ht, ctx) => {
  if (ctx.view === "up") return void dots(ctx, [[12, ht + 1], [13, ht + 1], [14, ht], [15, ht]], GREY.hi);
  dots(ctx, ctx.view === "down" ? [[13, ht], [14, ht], [15, ht], [12, ht + 1]] : [[14, ht], [15, ht], [16, ht], [13, ht + 1]], GREY.hi);
};

export function hairLayer(shape: HairShape, ...finish: HairFinish[]): LayerDraw {
  return (ctx) => {
    const { ht } = fitOf(ctx);
    const m = new Mask();
    shape(m, ht, ctx);
    fill(ctx, m);
    finish.forEach((f) => f(ht, ctx, m));
  };
}

/** Rounded crown that sits one pixel above the head. */
export function crown(m: Mask, ht: number): Mask {
  return m.add(12, ht - 1, 8, 1).add(11, ht, 10, 1).add(10, ht + 1, 12, 3);
}

/** Back of the head, seen from behind. */
export function backOfHead(m: Mask, ht: number, rows = 9): Mask {
  return crown(m, ht).add(10, ht + 4, 12, rows - 3).add(11, ht + 1 + rows, 10, 1);
}

export const shortShape: HairShape = (m, ht, { view }) => {
  if (view === "up") return void backOfHead(m, ht);
  crown(m, ht);
  if (view === "down") m.add(10, ht + 4, 2, 3).add(20, ht + 4, 2, 3).add(13, ht + 4, 3, 1).add(18, ht + 4, 2, 1);
  else m.add(15, ht + 4, 7, 4).add(10, ht + 4, 2, 1).add(17, ht + 8, 5, 2);
};

export const hairShort = hairLayer(shortShape, crownShine);

const curlyShape: HairShape = (m, ht, { view }) => {
  m.add(11, ht - 2, 3, 1).add(15, ht - 2, 3, 1).add(19, ht - 2, 2, 1);
  m.add(9, ht - 1, 14, 1).add(9, ht, 14, 4);
  if (view === "up") return void m.add(9, ht + 4, 14, 6).add(10, ht + 10, 3, 1).add(14, ht + 10, 4, 1).add(19, ht + 10, 3, 1);
  if (view === "down") m.add(9, ht + 4, 3, 4).add(20, ht + 4, 3, 4).add(13, ht + 4, 2, 1).add(17, ht + 4, 2, 1).add(9, ht + 8, 2, 1).add(21, ht + 8, 2, 1);
  else m.add(14, ht + 4, 9, 5).add(10, ht + 4, 2, 1).add(16, ht + 9, 3, 1).add(20, ht + 9, 3, 1);
};

/** Scattered curls: alternating lit and shaded pixels inside the silhouette. */
const curls: HairFinish = (ht, ctx, m) => {
  for (let y = ht - 2; y < ht + 16; y++) {
    for (let x = 6; x < 26; x++) {
      if (!m.has(x, y) || !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1)) continue;
      const k = (x + y * 3) % 7;
      if (k === 0) ctx.buf.set(x, y, GREY.hi);
      else if (k === 3) ctx.buf.set(x, y, GREY.deep);
    }
  }
};

export const hairCurly = hairLayer(curlyShape, curls);

/** The bun is its own round shape, so its outline separates it from the crown. */
const bunKnot: HairFinish = (ht, ctx) => {
  const x = ctx.view === "left" ? 18 : 13;
  const y = ctx.view === "left" ? ht - 3 : ht - 4;
  fill(ctx, new Mask().add(x + 1, y, 4, 1).add(x, y + 1, 6, 3).add(x + 1, y + 4, 4, 1));
};

export const hairBun = hairLayer(shortShape, crownShine, bunKnot);

/** Fine stipple that lets the skin read through short clipped hair. */
const clipped: HairFinish = (ht, ctx, m) => {
  for (let y = ht; y < ht + 10; y++) for (let x = 10; x < 22; x++) if (m.has(x, y) && (x + y) % 2 === 0 && m.has(x, y - 1)) ctx.buf.set(x, y, GREY.deep);
};

const buzzShape: HairShape = (m, ht, { view }) => {
  if (view === "up") return void m.add(11, ht, 10, 1).add(10, ht + 1, 12, 7).add(11, ht + 8, 10, 1);
  m.add(11, ht, 10, 1).add(10, ht + 1, 12, 2);
  if (view === "down") m.add(10, ht + 3, 1, 3).add(21, ht + 3, 1, 3);
  else m.add(16, ht + 3, 6, 4);
};

export const hairBuzz = hairLayer(buzzShape, clipped);

const fadeShape: HairShape = (m, ht) => {
  m.add(12, ht - 2, 8, 1).add(11, ht - 1, 10, 3).add(10, ht + 2, 12, 1);
};

/** The sides thin out into the skin in bands: solid, then checker, then sparse. */
const faded: HairFinish = (ht, ctx) => {
  const sideX = ctx.view === "down" ? [10, 11, 20, 21] : ctx.view === "up" ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] : [16, 17, 18, 19, 20, 21];
  for (const x of sideX) {
    for (let row = 0; row < 6; row++) {
      const y = ht + 3 + row;
      const on = row < 2 || (row < 4 ? (x + y) % 2 === 0 : row === 4 && x % 3 === 0);
      if (on) ctx.buf.set(x, y, GREY.deep);
    }
  }
  ctx.buf.rect(12, ht - 1, 6, 1, GREY.light);
  dots(ctx, [[13, ht - 2], [14, ht - 2], [15, ht - 2]], GREY.hi);
};

export const hairFade = hairLayer(fadeShape, faded);

const sidePartShape: HairShape = (m, ht, { view }) => {
  if (view === "up") return void backOfHead(m, ht);
  m.add(13, ht - 2, 8, 1).add(11, ht - 1, 11, 1).add(10, ht, 13, 3).add(10, ht + 3, 12, 1);
  if (view === "down") m.add(10, ht + 4, 1, 3).add(20, ht + 4, 2, 3).add(16, ht + 4, 5, 1);
  else m.add(15, ht + 4, 7, 4).add(17, ht + 8, 5, 2);
};

const partLine: HairFinish = (ht, ctx) => {
  if (ctx.view === "up") return;
  paintOver(ctx, 12, ht - 1, 1, 4, GREY.deep);
  dots(ctx, [[14, ht - 1], [15, ht - 1], [16, ht - 1], [17, ht], [18, ht]], GREY.hi);
  dots(ctx, [[15, ht + 2], [17, ht + 2], [19, ht + 2]], GREY.shade); // combed strands
};

export const hairSidePart = hairLayer(sidePartShape, partLine);

const afroShape: HairShape = (m, ht, { view }) => {
  const cx = 15.5;
  const cy = ht + 3.5;
  for (let y = ht - 5; y <= ht + 12; y++) {
    for (let x = 4; x < 28; x++) {
      if (Math.hypot(x - cx, (y - cy) * 1.05) <= 9.4) m.add(x, y, 1, 1);
    }
  }
  if (view === "down") m.cut(11, ht + 5, 10, 9).cut(12, ht + 4, 8, 1);
  else if (view === "left") m.cut(8, ht + 4, 8, 10);
};

export const hairAfro = hairLayer(afroShape, curls);
