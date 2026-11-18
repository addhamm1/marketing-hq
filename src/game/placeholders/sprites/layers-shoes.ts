import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, type Rect, fitOf } from "./anatomy";
import { GREY, dots, fill } from "./shader";

/** shoes layer, tinted with the shoe colour. Feet are three rows tall so the shading has room. */

function shoeMask(ctx: FrameCtx, [x, y, w, h]: Rect, extra = 1): Mask {
  const m = new Mask().add(x, y - extra, w, h + extra);
  if (ctx.view === "left") m.cut(x, y - extra, 2, extra); // toe slopes down at the front
  else m.cut(x, y - extra, 1, 1).cut(x + w - 1, y - extra, 1, 1);
  return m;
}

function eachFoot(ctx: FrameCtx, draw: (foot: Rect) => void): void {
  fitOf(ctx).feet.forEach(draw);
}

export const sneakers: LayerDraw = (ctx) =>
  eachFoot(ctx, (foot) => {
    const [x, y, w, h] = foot;
    fill(ctx, shoeMask(ctx, foot));
    ctx.buf.rect(x, y + h - 1, w, 1, GREY.hi); // white sole
    dots(ctx, ctx.view === "left" ? [[x + 3, y], [x + 4, y]] : [[x + 1, y], [x + 3, y]], GREY.hi); // laces
  });

export const boots: LayerDraw = (ctx) =>
  eachFoot(ctx, (foot) => {
    const [x, y, w, h] = foot;
    const shaftX = ctx.view === "left" ? x + 2 : x + (w > 4 ? 0 : 0);
    const shaftW = ctx.view === "left" ? w - 2 : w;
    const m = shoeMask(ctx, foot).add(shaftX, y - 4, shaftW, 4);
    fill(ctx, m);
    ctx.buf.rect(shaftX + 1, y - 3, Math.max(1, shaftW - 2), 1, GREY.hi); // cuff
    ctx.buf.rect(x, y + h - 1, w, 1, GREY.line); // heavy sole
  });

export const loafers: LayerDraw = (ctx) =>
  eachFoot(ctx, (foot) => {
    const [x, y, w, h] = foot;
    fill(ctx, shoeMask(ctx, foot));
    ctx.buf.rect(x + 1, y, Math.max(1, w - 2), 1, GREY.deep); // penny strap
    dots(ctx, ctx.view === "left" ? [[x + 2, y]] : [[x + (w >> 1), y]], GREY.hi); // the coin slot catches the light
    ctx.buf.rect(x, y + h - 1, w, 1, GREY.line);
  });

export const flats: LayerDraw = (ctx) =>
  eachFoot(ctx, ([x, y, w, h]) => {
    const toe: Rect = ctx.view === "left" ? [x, y, 4, h] : [x, y, w, h];
    fill(ctx, new Mask().add(...toe));
    ctx.buf.rect(x, y + h - 1, w, 1, GREY.deep); // thin sole
    if (ctx.view === "left") ctx.buf.rect(x, y + h - 1, w, 1, GREY.line);
    dots(ctx, ctx.view === "left" ? [[x + 1, y]] : [[x + (w >> 1), y]], GREY.hi); // small bow
  });

export const sandals: LayerDraw = (ctx) =>
  eachFoot(ctx, ([x, y, w, h]) => {
    ctx.buf.rect(x, y + h - 1, w, 1, GREY.deep); // sole
    ctx.buf.set(x, y + h - 1, GREY.line);
    ctx.buf.set(x + w - 1, y + h - 1, GREY.line);
    if (ctx.view === "left") {
      ctx.buf.rect(x + 2, y, 2, 1, GREY.light); // toe strap
      ctx.buf.rect(x + w - 2, y - 1, 1, 2, GREY.base); // heel strap
      return;
    }
    ctx.buf.rect(x + 1, y, Math.max(1, w - 2), 1, GREY.light);
    ctx.buf.set(x + (w >> 1), y, GREY.hi);
  });
