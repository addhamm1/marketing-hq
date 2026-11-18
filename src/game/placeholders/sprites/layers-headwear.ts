import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, fitOf } from "./anatomy";
import { GREY, type Tones, dots, fill } from "./shader";

/** Hats and head wraps. Hijab styles are in `layers-hijab.ts`, seasonal hats in `layers-seasonal.ts`. */

export function dome(m: Mask, ht: number, top = 2): Mask {
  return m.add(12, ht - top, 8, 1).add(11, ht - top + 1, 10, 1).add(10, ht - top + 2, 12, top + 2);
}

/** Baseball cap crown and peak. Peak is drawn second so its outline sits over the crown. */
export function capShape(ctx: FrameCtx, ht: number, t: Tones = GREY): void {
  fill(ctx, dome(new Mask(), ht), t);
  if (ctx.view === "down") fill(ctx, new Mask().add(9, ht + 3, 14, 3).cut(9, ht + 5, 1, 1).cut(22, ht + 5, 1, 1), t);
  else if (ctx.view === "left") fill(ctx, new Mask().add(5, ht + 3, 9, 3).cut(5, ht + 3, 1, 1), t);
  else {
    ctx.buf.rect(13, ht + 3, 6, 1, t.line); // adjustable strap
    ctx.buf.rect(14, ht + 2, 4, 1, t.deep);
  }
}

export const cap: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  capShape(ctx, ht);
  if (ctx.view !== "up") dots(ctx, [[15, ht - 2], [16, ht - 2]], GREY.deep); // top button
};

export const beanie: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  fill(ctx, dome(new Mask(), ht, 3).add(10, ht + 1, 12, 2));
  fill(ctx, new Mask().add(9, ht + 2, 14, 3));
  for (let x = 11; x < 21; x += 2) ctx.buf.rect(x, ht - 1, 1, 3, GREY.shade); // knit ribs
  for (let x = 10; x < 22; x += 2) ctx.buf.set(x, ht + 3, GREY.shade);
};

export const turbanWrap: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  const m = new Mask().add(12, ht - 3, 8, 1).add(10, ht - 2, 12, 1).add(9, ht - 1, 14, 5).add(10, ht + 4, 12, 1);
  if (ctx.view === "up") m.add(10, ht + 5, 12, 3);
  else if (ctx.view === "left") m.add(16, ht + 5, 6, 3);
  fill(ctx, m);
  if (ctx.view === "up") {
    for (let i = 0; i < 6; i++) dots(ctx, [[11 + i * 2, ht + i - 1], [12 + i * 2, ht + i - 1]], GREY.deep); // folds cross at the back
    return;
  }
  // Two folds crossing over the forehead.
  for (let i = 0; i < 6; i++) {
    dots(ctx, [[10 + i, ht - 1 + i]], GREY.deep);
    dots(ctx, [[21 - i, ht - 1 + i]], GREY.deep);
  }
  dots(ctx, [[12, ht], [13, ht - 1], [14, ht - 2], [15, ht - 2]], GREY.hi);
  dots(ctx, [[16, ht + 4], [15, ht + 3]], GREY.light);
};
