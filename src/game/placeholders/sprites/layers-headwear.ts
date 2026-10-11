import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, TINT, TINT_DETAIL, TINT_LIGHT, geometry } from "./anatomy";

/**
 * headwear layer (tinted with a clothing colour). The three hijab styles fully
 * cover hair, ears and neck and frame the face; the manifest marks them with
 * `hides: ["hair"]` so long hair never pokes out from underneath.
 */

function headwear(shape: (m: Mask, ht: number, ctx: FrameCtx) => void, detail?: (ht: number, ctx: FrameCtx) => void): LayerDraw {
  return (ctx) => {
    const { ht } = geometry(ctx.view, ctx.pose, "fit");
    const m = new Mask();
    shape(m, ht, ctx);
    m.paint(ctx.buf, 0, 0, TINT);
    detail?.(ht, ctx);
  };
}

export const cap = headwear(
  (m, ht, { view }) => {
    m.addRounded(10, ht - 2, 12, 5);
    if (view === "down") m.add(9, ht + 2, 14, 2);
    else if (view === "left") m.add(5, ht + 2, 9, 2);
    else m.add(13, ht + 3, 6, 1);
  },
  (ht, { buf, view }) => {
    if (view !== "up") buf.set(view === "down" ? 16 : 15, ht - 1, TINT_DETAIL); // button
  },
);

export const beanie = headwear(
  (m, ht) => {
    m.addRounded(10, ht - 2, 12, 6);
    m.addRounded(15, ht - 4, 2, 2);
  },
  (ht, { buf }) => buf.rect(11, ht + 2, 10, 1, TINT_DETAIL),
);

/** Head covering with a face opening (front and profile) and a neck piece. */
function hijabHead(m: Mask, ht: number, view: FrameCtx["view"], faceH: number): void {
  m.addRounded(9, ht - 1, 14, 14);
  if (view === "down") {
    m.cut(12, ht + 3, 8, faceH);
    m.add(12, ht + 3, 1, 1).add(19, ht + 3, 1, 1); // soften the opening's corners
    m.add(12, ht + 2 + faceH, 1, 1).add(19, ht + 2 + faceH, 1, 1);
  } else if (view === "left") {
    m.cut(9, ht + 3, 5, faceH);
    m.add(13, ht + 3, 1, 1).add(13, ht + 2 + faceH, 1, 1);
  }
}

export const hijabClassic = headwear(
  (m, ht, { view }) => {
    hijabHead(m, ht, view, 8);
    // drape over neck and shoulders, falling to a soft point at the chest
    if (view === "left") m.add(11, ht + 12, 12, 5).add(13, ht + 17, 8, 2);
    else m.addRounded(8, ht + 12, 16, 5).add(11, ht + 17, 10, 1).add(13, ht + 18, 6, 1);
  },
  (ht, { buf, view }) => {
    if (view === "down") buf.rect(11, ht + 13, 10, 1, TINT.shadow); // drape fold
    if (view === "up") buf.rect(16, ht + 2, 1, 12, TINT.shadow); // back seam
  },
);

export const hijabWrap = headwear(
  (m, ht, { view }) => {
    hijabHead(m, ht, view, 7);
    if (view === "down") m.addRounded(10, ht + 11, 12, 4).add(18, ht + 12, 4, 6); // wrapped tail over one shoulder
    else if (view === "up") m.addRounded(10, ht + 11, 12, 4).add(10, ht + 12, 4, 6);
    else m.add(11, ht + 11, 11, 4).add(17, ht + 12, 5, 5);
  },
  (ht, { buf, view }) => {
    if (view === "up") return;
    // diagonal wrap fold across the crown, kept above the face opening
    const x0 = view === "down" ? 11 : 14;
    const len = view === "down" ? 10 : 8;
    for (let i = 0; i < len; i++) buf.set(x0 + i, ht + 2 - (i >> 2), TINT_DETAIL);
    buf.set(x0 + 1, ht + 1, TINT_LIGHT);
  },
);

export const hijabSport = headwear(
  (m, ht, { view }) => {
    hijabHead(m, ht, view, 8);
    // snug pull-on: fitted neck piece, no long drape
    if (view === "left") m.add(11, ht + 11, 11, 4);
    else m.addRounded(10, ht + 11, 12, 4);
  },
  (ht, { buf, view }) => {
    if (view === "up") buf.rect(10, ht + 4, 12, 1, TINT_LIGHT);
    else if (view === "down") {
      buf.rect(10, ht + 1, 12, 1, TINT_LIGHT); // band seam
      buf.rect(12, ht + 13, 8, 1, TINT.shadow);
    } else buf.rect(14, ht + 1, 8, 1, TINT_LIGHT);
  },
);
