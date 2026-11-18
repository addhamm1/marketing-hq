import { Mask } from "../pixels";
import type { FrameCtx } from "./anatomy";
import { type HairFinish, type HairShape, backOfHead, crownShine, hairLayer, shortShape } from "./layers-hair";
import { GREY, dots, fill } from "./shader";

/** Hair past the shoulders: long, wavy long, ponytail and braids. */

/** Vertical strands so long hair reads as hair and not as a solid block. */
const strands: HairFinish = (ht, ctx, m) => {
  for (const x of [10, 12, 19, 21]) {
    for (let y = ht + 6; y < ht + 17; y++) if (m.has(x, y) && m.has(x, y - 1) && m.has(x, y + 1) && (y + x) % 3 !== 0) ctx.buf.set(x, y, GREY.shade);
  }
};

const longShape: HairShape = (m, ht, ctx) => {
  shortShape(m, ht, ctx);
  if (ctx.view === "down") m.add(9, ht + 2, 3, 14).add(20, ht + 2, 3, 14);
  else if (ctx.view === "up") backOfHead(m, ht, 15).add(9, ht + 3, 14, 12);
  else m.add(15, ht + 2, 8, 14);
};

export const hairLong = hairLayer(longShape, crownShine, strands);

/** One column of hair whose edge ripples down its length. */
function ripple(m: Mask, x: number, w: number, from: number, to: number): void {
  for (let y = from; y <= to; y++) {
    const wave = [0, 1, 1, 0, -1, -1][(y - from) % 6];
    m.add(x + wave, y, w, 1);
  }
}

const wavyShape: HairShape = (m, ht, ctx) => {
  shortShape(m, ht, ctx);
  if (ctx.view === "down") {
    ripple(m, 9, 3, ht + 3, ht + 17);
    ripple(m, 20, 3, ht + 3, ht + 17);
  } else if (ctx.view === "up") {
    backOfHead(m, ht, 9);
    ripple(m, 9, 14, ht + 8, ht + 17);
  } else {
    ripple(m, 15, 8, ht + 3, ht + 17);
  }
};

const waves: HairFinish = (ht, ctx, m) => {
  for (let y = ht + 5; y < ht + 18; y += 3) {
    for (let x = 8; x < 25; x += 2) if (m.has(x, y) && m.has(x - 1, y) && m.has(x + 1, y)) ctx.buf.set(x, y, y % 2 === 0 ? GREY.light : GREY.shade);
  }
};

export const hairWavyLong = hairLayer(wavyShape, crownShine, waves);

function tail(ctx: FrameCtx, ht: number): Mask {
  const swing = ctx.pose.stride;
  if (ctx.view === "left") return new Mask().add(21, ht + 2, 3, 3).add(22 + swing, ht + 5, 3, 5).add(22 + swing, ht + 10, 2, 2);
  if (ctx.view === "up") return new Mask().add(14, ht + 3, 4, 8).add(15 + swing, ht + 11, 2, 3);
  return new Mask().add(21, ht + 3, 2, 7).add(22, ht + 6, 2, 4);
}

const ponytailShape: HairShape = (m, ht, ctx) => shortShape(m, ht, ctx);

const ponytailTail: HairFinish = (ht, ctx) => {
  fill(ctx, tail(ctx, ht));
  if (ctx.view === "up") ctx.buf.rect(14, ht + 3, 4, 1, GREY.line); // hair tie
  else if (ctx.view === "left") ctx.buf.rect(21, ht + 3, 1, 2, GREY.line);
};

export const hairPonytail = hairLayer(ponytailShape, crownShine, ponytailTail);

/** A plait: three-pixel links with a darker centre and a tied end. */
function plait(ctx: FrameCtx, x: number, from: number, to: number): void {
  const m = new Mask();
  for (let y = from; y <= to; y++) m.add((y - from) % 4 < 2 ? x : x + 1, y, 3, 1);
  fill(ctx, m);
  for (let y = from + 1; y < to; y += 2) ctx.buf.set(x + 1 + ((y - from) % 4 < 2 ? 0 : 1), y, GREY.hi);
  ctx.buf.rect(x, to + 1, 4, 1, GREY.line);
}

const braidsFinish: HairFinish = (ht, ctx) => {
  if (ctx.view === "down") {
    plait(ctx, 8, ht + 5, ht + 16);
    plait(ctx, 20, ht + 5, ht + 16);
  } else if (ctx.view === "up") {
    plait(ctx, 11, ht + 7, ht + 17);
    plait(ctx, 17, ht + 7, ht + 17);
  } else {
    plait(ctx, 18, ht + 7, ht + 17);
  }
  const { view } = ctx;
  if (view !== "up") dots(ctx, view === "down" ? [[15, ht], [15, ht + 1], [15, ht + 2]] : [[15, ht], [16, ht + 1]], GREY.deep); // centre parting
};

export const hairBraids = hairLayer(shortShape, crownShine, braidsFinish);
