import { Mask } from "../pixels";
import { type FrameCtx, type LayerDraw, TINT, TINT_DETAIL, TINT_LIGHT, geometry } from "./anatomy";

/** hair and facial_hair layers (both tinted with the hair colour). */

type HairShape = (m: Mask, ht: number, ctx: FrameCtx) => void;

function hairLayer(shape: HairShape, texture?: "curl" | "fine"): LayerDraw {
  return (ctx) => {
    const { ht } = geometry(ctx.view, ctx.pose, "fit");
    const m = new Mask();
    shape(m, ht, ctx);
    m.paint(ctx.buf, 0, 0, TINT);
    if (!texture) return;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        if (!m.has(x, y) || !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1)) continue;
        if (texture === "curl" && (x + y * 2) % 4 === 0) ctx.buf.set(x, y, TINT_DETAIL);
        if (texture === "fine" && (x + y) % 2 === 0) ctx.buf.set(x, y, TINT.shadow);
      }
    }
  };
}

/** Base short cut, reused by long, bun and others. */
const shortShape: HairShape = (m, ht, { view }) => {
  if (view === "up") {
    m.addRounded(10, ht - 1, 12, 10);
    return;
  }
  m.addRounded(10, ht - 1, 12, 5);
  if (view === "down") {
    m.add(10, ht + 3, 2, 4).add(20, ht + 3, 2, 4);
    m.cut(14, ht + 3, 3, 1).cut(18, ht + 3, 1, 1); // fringe gaps
  } else {
    m.add(15, ht + 3, 7, 5).add(11, ht + 3, 1, 2);
  }
};

const longShape: HairShape = (m, ht, ctx) => {
  shortShape(m, ht, ctx);
  if (ctx.view === "down") m.add(9, ht + 3, 3, 13).add(20, ht + 3, 3, 13);
  else if (ctx.view === "up") m.addRounded(9, ht - 1, 14, 17);
  else m.add(15, ht + 3, 8, 13);
};

const curlyShape: HairShape = (m, ht, { view }) => {
  if (view === "up") {
    m.addRounded(8, ht - 2, 16, 13);
    return;
  }
  m.addRounded(9, ht - 2, 14, 6);
  if (view === "down") {
    m.addRounded(8, ht + 1, 4, 8).addRounded(20, ht + 1, 4, 8);
    m.add(12, ht + 3, 2, 1).add(18, ht + 3, 2, 1);
  } else {
    m.addRounded(14, ht + 1, 10, 9);
  }
};

const bunShape: HairShape = (m, ht, ctx) => {
  shortShape(m, ht, ctx);
  if (ctx.view === "left") m.addRounded(18, ht - 3, 5, 5);
  else m.addRounded(13, ht - 4, 6, 4);
};

const buzzShape: HairShape = (m, ht, { view }) => {
  if (view === "up") m.addRounded(10, ht - 1, 12, 8);
  else if (view === "down") m.addRounded(10, ht - 1, 12, 3).add(10, ht + 2, 1, 2).add(21, ht + 2, 1, 2);
  else m.addRounded(10, ht - 1, 12, 3).add(16, ht + 2, 6, 4);
};

export const hairShort = hairLayer(shortShape);
export const hairLong = hairLayer(longShape, "fine");
export const hairCurly = hairLayer(curlyShape, "curl");
export const hairBun = hairLayer(bunShape);
export const hairBuzz = hairLayer(buzzShape, "fine");

export const beard: LayerDraw = (ctx) => {
  if (ctx.view === "up") return;
  const { ht } = geometry(ctx.view, ctx.pose, "fit");
  const m = new Mask();
  if (ctx.view === "down") {
    m.addRounded(11, ht + 7, 10, 6).cut(13, ht + 7, 6, 1).cut(15, ht + 9, 2, 1);
    m.add(10, ht + 5, 1, 3).add(21, ht + 5, 1, 3);
  } else {
    m.addRounded(9, ht + 7, 8, 6).add(15, ht + 5, 2, 3);
  }
  m.paint(ctx.buf, 0, 0, TINT);
};

export const mustache: LayerDraw = (ctx) => {
  if (ctx.view === "up") return;
  const { ht } = geometry(ctx.view, ctx.pose, "fit");
  if (ctx.view === "down") {
    ctx.buf.rect(13, ht + 8, 6, 1, TINT.outline);
    ctx.buf.rect(14, ht + 8, 4, 1, TINT.shadow);
    ctx.buf.set(15, ht + 8, TINT_LIGHT);
  } else {
    ctx.buf.rect(9, ht + 8, 3, 1, TINT.outline);
  }
};
