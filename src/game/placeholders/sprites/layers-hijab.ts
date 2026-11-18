import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, type View, fitOf } from "./anatomy";
import { GREY, dots, fill, paintOver } from "./shader";

/**
 * Hijab styles. Each fully covers hair, ears and neck and frames the face; the
 * manifest marks them with `hides: ["hair"]` so long hair never pokes out.
 */

/** Head covering with a soft oval opening for the face. */
function headCover(view: View, ht: number): Mask {
  const m = new Mask().add(12, ht - 2, 8, 1).add(10, ht - 1, 12, 1).add(9, ht, 14, 10).add(10, ht + 10, 12, 2).add(11, ht + 12, 10, 1);
  if (view === "down") {
    m.cut(12, ht + 3, 8, 8).cut(13, ht + 2, 6, 1).cut(13, ht + 11, 6, 1);
  } else if (view === "left") {
    m.cut(9, ht + 3, 6, 8).cut(9, ht + 2, 4, 1).cut(9, ht + 11, 5, 1);
    m.cut(9, ht, 1, 3);
  }
  return m;
}

function hijab(drape: (m: Mask, ht: number, ctx: FrameCtx) => void, detail?: (ht: number, ctx: FrameCtx) => void): LayerDraw {
  return (ctx) => {
    const { ht } = fitOf(ctx);
    const under = new Mask();
    drape(under, ht, ctx);
    fill(ctx, under);
    fill(ctx, headCover(ctx.view, ht));
    if (ctx.view !== "up") dots(ctx, [[13, ht - 1], [14, ht - 1], [12, ht], [11, ht + 1]], GREY.hi);
    detail?.(ht, ctx);
  };
}

export const hijabClassic = hijab(
  (m, ht, { view }) => {
    if (view === "left") m.add(11, ht + 12, 12, 5).add(13, ht + 17, 8, 2);
    else m.add(9, ht + 12, 14, 5).add(11, ht + 17, 10, 1).add(13, ht + 18, 6, 1);
  },
  (ht, ctx) => {
    if (ctx.view === "down") paintOver(ctx, 12, ht + 14, 8, 1, GREY.shade);
    if (ctx.view === "up") ctx.buf.rect(16, ht + 2, 1, 13, GREY.shade);
  },
);

export const hijabWrap = hijab(
  (m, ht, { view }) => {
    if (view === "down") m.add(10, ht + 12, 12, 4).add(18, ht + 13, 5, 7);
    else if (view === "up") m.add(10, ht + 12, 12, 4).add(9, ht + 13, 5, 7);
    else m.add(11, ht + 12, 11, 4).add(17, ht + 13, 5, 6);
  },
  (ht, ctx) => {
    if (ctx.view === "up") return;
    const x0 = ctx.view === "down" ? 11 : 14;
    for (let i = 0; i < 10; i++) ctx.buf.set(x0 + i, ht + 2 - (i >> 2), GREY.deep); // wrap fold across the crown
  },
);

export const hijabSport = hijab(
  (m, ht, { view }) => {
    if (view === "left") m.add(11, ht + 12, 11, 3);
    else m.add(10, ht + 12, 12, 3);
  },
  (ht, ctx) => {
    if (ctx.view === "up") ctx.buf.rect(10, ht + 4, 12, 1, GREY.hi);
    else if (ctx.view === "down") ctx.buf.rect(10, ht, 12, 1, GREY.hi);
    else ctx.buf.rect(14, ht, 8, 1, GREY.hi);
  },
);

/** Long shawl falling evenly to the waist on both sides. */
export const hijabDraped = hijab(
  (m, ht, { view }) => {
    if (view === "left") m.add(11, ht + 12, 12, 10).add(13, ht + 22, 8, 1);
    else m.add(8, ht + 12, 16, 9).add(9, ht + 21, 14, 1).add(11, ht + 22, 10, 1);
  },
  (ht, ctx) => {
    if (ctx.view !== "down") return;
    for (const x of [10, 13, 18, 21]) paintOver(ctx, x, ht + 14, 1, 7, GREY.shade);
    paintOver(ctx, 11, ht + 13, 10, 1, GREY.deep);
  },
);

/** Layered folds under the chin, closed with a small pin. */
export const hijabLayered = hijab(
  (m, ht, { view }) => {
    if (view === "left") m.add(11, ht + 12, 11, 6);
    else m.add(9, ht + 12, 14, 6).add(11, ht + 18, 10, 1);
  },
  (ht, ctx) => {
    if (ctx.view === "down") {
      paintOver(ctx, 10, ht + 13, 12, 1, GREY.deep);
      paintOver(ctx, 11, ht + 15, 10, 1, GREY.deep);
      paintOver(ctx, 12, ht + 17, 8, 1, GREY.shade);
      dots(ctx, [[19, ht + 11], [20, ht + 11]], GREY.hi); // pin
    } else if (ctx.view === "left") {
      paintOver(ctx, 12, ht + 14, 9, 1, GREY.deep);
      paintOver(ctx, 12, ht + 16, 9, 1, GREY.shade);
    }
  },
);

/** One end thrown across the chest and over the shoulder. */
export const hijabShawl = hijab(
  (m, ht, { view }) => {
    if (view === "down") {
      m.add(9, ht + 12, 14, 4);
      for (let i = 0; i < 7; i++) m.add(9 + i, ht + 15 + i, 9, 1);
    } else if (view === "up") {
      m.add(9, ht + 12, 14, 5).add(11, ht + 17, 10, 2).add(13, ht + 19, 6, 1);
    } else {
      m.add(11, ht + 12, 12, 5).add(13, ht + 17, 9, 3);
    }
  },
  (ht, ctx) => {
    if (ctx.view !== "down") return;
    for (let i = 0; i < 6; i++) ctx.buf.set(12 + i, ht + 15 + i, GREY.deep);
    for (let i = 0; i < 5; i++) ctx.buf.set(15 + i, ht + 15 + i, GREY.shade);
  },
);
