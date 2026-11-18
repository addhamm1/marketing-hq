import { Mask, hex } from "../pixels";
import { type FrameCtx, type LayerDraw, fitOf } from "./anatomy";
import { GREY, type Tones, dots, fill, fixed } from "./shader";

/** glasses and accessory layers. Backpack and scarf take a colour, the rest keep their own. */

const FRAME = hex("#22262e");
const LENS = hex("#d6ecff66");
const SHINE = hex("#ffffffb0");
const DARK_LENS = hex("#14171ce8");

function lens(ctx: FrameCtx, x: number, y: number, round: boolean, glass: readonly [number, number, number, number]): void {
  const m = new Mask();
  m.add(x, y, 4, 4);
  if (round) m.cut(x, y, 1, 1).cut(x + 3, y, 1, 1).cut(x, y + 3, 1, 1).cut(x + 3, y + 3, 1, 1);
  for (let yy = y; yy < y + 4; yy++) {
    for (let xx = x; xx < x + 4; xx++) {
      if (!m.has(xx, yy)) continue;
      const edge = !m.has(xx - 1, yy) || !m.has(xx + 1, yy) || !m.has(xx, yy - 1) || !m.has(xx, yy + 1);
      ctx.buf.set(xx, yy, edge ? FRAME : glass);
    }
  }
  ctx.buf.set(x + 1, y + 1, SHINE);
}

function glasses(round: boolean, glass: readonly [number, number, number, number]): LayerDraw {
  return (ctx) => {
    const y = fitOf(ctx).ht + 5;
    if (ctx.view === "down") {
      lens(ctx, 11, y, round, glass);
      lens(ctx, 17, y, round, glass);
      ctx.buf.rect(15, y + 1, 2, 1, FRAME);
      dots(ctx, [[10, y + 1], [21, y + 1]], FRAME);
    } else if (ctx.view === "left") {
      lens(ctx, 10, y, round, glass);
      ctx.buf.rect(14, y + 1, 4, 1, FRAME);
    } else {
      dots(ctx, [[10, y + 1], [21, y + 1]], FRAME);
    }
  };
}

export const glassesRound = glasses(true, LENS);
export const glassesSquare = glasses(false, LENS);
export const sunglasses = glasses(false, DARK_LENS);

const BAND = fixed("#30343c");
const CUSHION = fixed("#d9765f");

export const headphones: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  const cup = (x: number, w: number) => {
    fill(ctx, new Mask().add(x, ht + 4, w, 6), BAND);
    ctx.buf.rect(x + 1, ht + 5, Math.max(1, w - 2), 4, CUSHION.base);
  };
  if (ctx.view === "left") {
    const arc = new Mask().add(15, ht - 2, 3, 1).add(16, ht - 2, 2, 7);
    fill(ctx, arc, BAND);
    cup(15, 4);
    return;
  }
  fill(ctx, new Mask().add(11, ht - 3, 10, 2).add(9, ht - 2, 3, 2).add(20, ht - 2, 3, 2).add(9, ht, 2, 4).add(21, ht, 2, 4), BAND);
  ctx.buf.rect(13, ht - 3, 6, 1, BAND.light);
  cup(7, 4);
  cup(21, 4);
};

const STRAP = fixed("#2d6372");
const CARD = fixed("#f4f1ea");

export const lanyard: LayerDraw = (ctx) => {
  const { by } = fitOf(ctx);
  if (ctx.view === "down") {
    for (let i = 0; i < 4; i++) dots(ctx, [[13 + (i >> 1), by + i], [18 - (i >> 1), by + i]], STRAP.base);
    fill(ctx, new Mask().add(14, by + 4, 4, 5), CARD);
    ctx.buf.rect(15, by + 5, 2, 1, STRAP.base);
  } else if (ctx.view === "left") {
    ctx.buf.rect(13, by, 1, 4, STRAP.base);
    fill(ctx, new Mask().add(12, by + 4, 3, 4), CARD);
  } else {
    ctx.buf.rect(12, by, 8, 1, STRAP.base);
  }
};

export const backpack: LayerDraw = (ctx) => {
  const { by } = fitOf(ctx);
  if (ctx.view === "up") {
    fill(ctx, new Mask().add(11, by + 1, 10, 9).add(12, by, 8, 1));
    ctx.buf.rect(12, by + 6, 8, 1, GREY.deep);
    fill(ctx, new Mask().add(13, by + 6, 6, 3));
    dots(ctx, [[15, by + 7], [16, by + 7]], GREY.hi);
    ctx.buf.rect(14, by - 1, 4, 1, GREY.deep); // top handle
  } else if (ctx.view === "left") {
    fill(ctx, new Mask().add(18, by + 1, 5, 8));
    ctx.buf.rect(19, by + 5, 3, 1, GREY.deep);
    dots(ctx, [[14, by], [15, by], [16, by], [17, by + 1]], GREY.deep); // strap over the shoulder
    dots(ctx, [[14, by + 1], [14, by + 2], [14, by + 3]], GREY.deep);
  } else {
    fill(ctx, new Mask().add(12, by, 3, 7));
    fill(ctx, new Mask().add(17, by, 3, 7));
    ctx.buf.set(13, by + 4, GREY.hi);
    ctx.buf.set(18, by + 4, GREY.hi);
  }
};

const LEATHER = fixed("#6b4226");
const BODY = fixed("#23262b");

export const cameraStrap: LayerDraw = (ctx) => {
  const { by } = fitOf(ctx);
  if (ctx.view === "up") {
    for (let i = 0; i < 9; i++) ctx.buf.set(19 - i, by + i, LEATHER.base);
    return;
  }
  if (ctx.view === "left") {
    dots(ctx, [[14, by], [14, by + 1], [14, by + 2], [13, by + 3], [13, by + 4]], LEATHER.base);
    fill(ctx, new Mask().add(10, by + 5, 6, 4), BODY);
    ctx.buf.set(10, by + 7, BODY.hi);
    return;
  }
  for (let i = 0; i < 6; i++) ctx.buf.set(12 + i, by + i, LEATHER.base);
  fill(ctx, new Mask().add(16, by + 5, 6, 4), BODY);
  fill(ctx, new Mask().add(18, by + 6, 3, 3), fixed("#6f8fa8"));
  ctx.buf.set(19, by + 7, BODY.hi);
  ctx.buf.rect(17, by + 4, 2, 1, BODY.base);
};

/** Wrapped scarf with a tail on the chest: stripes are passed in by the seasonal scarves. */
export function paintScarf(ctx: FrameCtx, t: Tones, stripe?: (x: number, y: number) => Tones["base"] | null): void {
  const { by } = fitOf(ctx);
  const wrap = new Mask();
  const tailM = new Mask();
  if (ctx.view === "down") {
    wrap.add(11, by - 1, 10, 3).cut(11, by - 1, 1, 1).cut(20, by - 1, 1, 1);
    tailM.add(17, by + 2, 3, 6);
  } else if (ctx.view === "left") {
    wrap.add(11, by - 1, 10, 3);
    tailM.add(17, by + 1, 4, 5);
  } else {
    wrap.add(11, by - 1, 10, 3);
    tailM.add(13, by + 2, 4, 4);
  }
  fill(ctx, tailM, t);
  fill(ctx, wrap, t);
  if (ctx.view === "down") ctx.buf.rect(13, by, 6, 1, t.shade);
  if (!stripe) {
    ctx.buf.rect(tailM.has(17, by + 6) ? 17 : 13, by + 6, 3, 1, t.light);
    return;
  }
  for (const m of [tailM, wrap]) {
    for (let y = by - 1; y < by + 9; y++) {
      for (let x = 10; x < 22; x++) {
        if (!m.has(x, y) || !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1)) continue;
        const c = stripe(x, y);
        if (c) ctx.buf.set(x, y, c);
      }
    }
  }
}

export const scarf: LayerDraw = (ctx) => paintScarf(ctx, GREY);
