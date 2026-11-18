import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, fitOf } from "./anatomy";
import { GREY, dots, fill } from "./shader";

/** facial_hair layer, tinted with the hair colour. Nothing shows from behind. */

function facial(front: (ctx: FrameCtx, ht: number) => void, side: (ctx: FrameCtx, ht: number) => void): LayerDraw {
  return (ctx) => {
    if (ctx.view === "up") return;
    const { ht } = fitOf(ctx);
    (ctx.view === "down" ? front : side)(ctx, ht);
  };
}

export const stubble = facial(
  (ctx, ht) => {
    for (let y = ht + 8; y < ht + 12; y++) {
      for (let x = 10; x < 22; x++) {
        const onJaw = y >= ht + 9 || x < 12 || x > 19;
        if (onJaw && (x + y) % 2 === 0 && !(y === ht + 10 && x >= 15 && x <= 16)) ctx.buf.set(x, y, GREY.deep);
      }
    }
  },
  (ctx, ht) => {
    for (let y = ht + 8; y < ht + 12; y++) for (let x = 11; x < 18; x++) if ((x + y) % 2 === 0 && y >= ht + 9) ctx.buf.set(x, y, GREY.deep);
  },
);

export const mustache = facial(
  (ctx, ht) => {
    ctx.buf.rect(13, ht + 9, 6, 1, GREY.deep);
    dots(ctx, [[14, ht + 9], [15, ht + 9]], GREY.light);
    dots(ctx, [[13, ht + 10], [18, ht + 10]], GREY.line);
  },
  (ctx, ht) => {
    ctx.buf.rect(9, ht + 9, 4, 1, GREY.deep);
    ctx.buf.set(10, ht + 9, GREY.light);
  },
);

export const goatee = facial(
  (ctx, ht) => {
    ctx.buf.rect(14, ht + 9, 4, 1, GREY.deep);
    fill(ctx, new Mask().add(14, ht + 11, 4, 2));
    dots(ctx, [[15, ht + 11]], GREY.light);
  },
  (ctx, ht) => {
    ctx.buf.rect(10, ht + 9, 3, 1, GREY.deep);
    fill(ctx, new Mask().add(11, ht + 10, 4, 3));
  },
);

/** A short boxed beard that hugs the jaw. */
export const beard = facial(
  (ctx, ht) => {
    const m = new Mask().add(10, ht + 7, 2, 3).add(20, ht + 7, 2, 3).add(11, ht + 9, 10, 2).add(13, ht + 11, 6, 1);
    m.cut(15, ht + 10, 2, 1);
    fill(ctx, m);
    dots(ctx, [[13, ht + 9], [14, ht + 9], [17, ht + 9]], GREY.light);
  },
  (ctx, ht) => {
    fill(ctx, new Mask().add(16, ht + 6, 2, 4).add(10, ht + 9, 8, 2).add(12, ht + 11, 5, 1).cut(10, ht + 10, 2, 1));
  },
);

/** A fuller beard that sits past the chin. */
export const fullBeard = facial(
  (ctx, ht) => {
    const m = new Mask().add(10, ht + 6, 2, 4).add(20, ht + 6, 2, 4).add(10, ht + 9, 12, 3).add(11, ht + 12, 10, 1).add(13, ht + 13, 6, 1);
    m.cut(15, ht + 10, 2, 1);
    fill(ctx, m);
    dots(ctx, [[12, ht + 10], [14, ht + 12], [17, ht + 11], [19, ht + 10]], GREY.shade);
    dots(ctx, [[13, ht + 9], [14, ht + 9], [17, ht + 9], [18, ht + 9]], GREY.light);
  },
  (ctx, ht) => {
    fill(ctx, new Mask().add(16, ht + 5, 2, 5).add(10, ht + 9, 8, 3).add(11, ht + 12, 6, 1).add(12, ht + 13, 4, 1).cut(10, ht + 10, 2, 1));
    dots(ctx, [[13, ht + 11], [15, ht + 10]], GREY.shade);
  },
);
