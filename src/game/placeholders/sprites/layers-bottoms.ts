import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, type Rect, fitOf } from "./anatomy";
import { GREY, dimmed, dots, fill, paintOver } from "./shader";

/** bottom layer: trousers and skirts, tinted with the bottom colour. */

const hipRect = ({ view }: FrameCtx): Rect => (view === "left" ? [12, 22, 8, 4] : [11, 22, 10, 4]);

type LegShape = (leg: Rect, side: -1 | 1, ctx: FrameCtx) => Rect[];

const straight: LegShape = (leg) => [leg];

/** Hip plus legs, far leg first so a stride reads in profile. */
function trousers(ctx: FrameCtx, shape: LegShape = straight): void {
  const { legs } = fitOf(ctx);
  const sideOf = (i: number): -1 | 1 => (i === 0 ? -1 : 1);
  if (ctx.view === "left" && legs.length > 1) {
    const far = new Mask();
    for (const r of shape(legs[0], -1, ctx)) far.add(...r);
    fill(ctx, far, dimmed(GREY));
    const near = new Mask().add(...hipRect(ctx));
    for (const r of shape(legs[1], 1, ctx)) near.add(...r);
    fill(ctx, near);
    return;
  }
  const m = new Mask().add(...hipRect(ctx));
  legs.forEach((leg, i) => shape(leg, sideOf(i), ctx).forEach((r) => m.add(...r)));
  fill(ctx, m);
}

/** A dark waistband row just under where tops end. */
function waistband(ctx: FrameCtx): void {
  const [x, y, w] = hipRect(ctx);
  ctx.buf.rect(x + 1, y + 1, w - 2, 1, GREY.deep);
}

export const pants: LayerDraw = (ctx) => {
  trousers(ctx);
  waistband(ctx);
  if (ctx.view === "left") return;
  for (const [x, y, w, h] of fitOf(ctx).legs) paintOver(ctx, x + (w >> 1), y + 2, 1, h - 2, GREY.shade); // pressed crease
};

export const jeans: LayerDraw = (ctx) => {
  trousers(ctx);
  waistband(ctx);
  for (const [x, y, w, h] of fitOf(ctx).legs) {
    ctx.buf.rect(x + 1, y + h - 1, w - 2, 1, GREY.hi); // turned-up hem
    dots(ctx, [[x + 1, y + 1], [x + 1, y + 3]], GREY.light); // seam stitching
  }
  if (ctx.view === "up") dots(ctx, [[13, 25], [18, 25]], GREY.light); // back pockets
};

const tapered: LegShape = ([x, y, w, h], side, ctx) =>
  ctx.view === "left" ? [[x, y, w, h]] : [[x, y, w, h - 2], side < 0 ? [x + 1, y + h - 2, w - 1, 2] : [x, y + h - 2, w - 1, 2]];

export const chinos: LayerDraw = (ctx) => {
  trousers(ctx, tapered);
  waistband(ctx);
  if (ctx.view === "down") dots(ctx, [[12, 24], [13, 25], [19, 24], [18, 25]], GREY.shade); // slant pockets
};

const flared: LegShape = ([x, y, w, h], side, ctx) => {
  if (ctx.view === "left") return [[x, y, w, 2], [x - 1, y + 2, w + 2, h - 2], [x - 1, y + h, w + 2, 1]];
  const out = (n: number) => (side < 0 ? x - n : x);
  const inner = side < 0 ? 1 : 1;
  return [[x, y, w, 2], [out(1), y + 2, w + 1 + inner, h - 2], [out(2), y + h - 1, w + 2 + inner, 2]];
};

export const wideLeg: LayerDraw = (ctx) => {
  trousers(ctx, flared);
  waistband(ctx);
  if (ctx.view === "left") return;
  for (const [x, y, w, h] of fitOf(ctx).legs) paintOver(ctx, x + (w >> 1), y + 1, 1, h, GREY.shade); // long fold
};

const cropped: LegShape = ([x, y, w]) => [[x, y, w, 3]];

export const shorts: LayerDraw = (ctx) => {
  trousers(ctx, cropped);
  waistband(ctx);
};

function skirtShape(ctx: FrameCtx, hemY: number, flareEvery: number): Mask {
  const [x0, , w0] = hipRect(ctx);
  const m = new Mask();
  for (let y = 22; y <= hemY; y++) {
    const spread = Math.floor((y - 22) / flareEvery);
    const sway = y >= hemY - 1 ? ctx.pose.stride : 0;
    m.add(x0 - spread + sway, y, w0 + spread * 2, 1);
  }
  return m;
}

function skirtOf(hemY: number, flareEvery: number, pleats: number[]): LayerDraw {
  return (ctx) => {
    fill(ctx, skirtShape(ctx, hemY, flareEvery));
    waistband(ctx);
    for (const x of pleats) paintOver(ctx, x, 25, 1, hemY - 25, GREY.shade);
  };
}

export const skirt = skirtOf(27, 3, [13, 16, 19]);
export const longSkirt = skirtOf(29, 4, [13, 16, 19]);
