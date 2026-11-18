import { Mask, hex } from "../pixels";
import { type FrameCtx, type LayerDraw, fitOf } from "./anatomy";
import { cuffs, paintTop, rib } from "./garment";
import { GREY, dots, fill, fixed } from "./shader";

/** Everyday tops, tinted with the top colour. Untinted parts live in `*Inner` overlays. */

/** Small folded collar on both sides of the neck. */
function collar(ctx: FrameCtx, by: number): void {
  if (ctx.view === "down") {
    dots(ctx, [[13, by], [14, by], [14, by + 1], [13, by + 1]], GREY.hi);
    dots(ctx, [[18, by], [17, by], [17, by + 1], [18, by + 1]], GREY.hi);
    dots(ctx, [[13, by + 2], [18, by + 2]], GREY.line);
  } else if (ctx.view === "left") {
    ctx.buf.rect(12, by, 4, 1, GREY.hi);
    ctx.buf.rect(12, by + 1, 2, 1, GREY.light);
  } else {
    ctx.buf.rect(12, by, 8, 1, GREY.hi);
  }
}

export const tshirt: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 3 });
  cuffs(ctx, g, 3, GREY.shade);
};

export const polo: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 3, neck: "open" });
  cuffs(ctx, g, 3, GREY.hi);
  collar(ctx, g.by);
  if (ctx.view === "down") dots(ctx, [[16, g.by + 2], [16, g.by + 3], [15, g.by + 2]], GREY.line);
};

export const hoodie: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 6, hem: 1, neck: "open" });
  const { by } = g;
  cuffs(ctx, g, 6, GREY.deep);
  const [tx, ty, tw, th] = g.torso;
  ctx.buf.rect(tx + 1, ty + th - 1, tw - 2, 1, GREY.shade); // ribbed hem
  if (ctx.view === "down") {
    fill(ctx, new Mask().add(11, by - 1, 3, 3).add(18, by - 1, 3, 3).add(14, by + 1, 4, 1));
    dots(ctx, [[14, by + 2], [14, by + 3], [17, by + 2], [17, by + 3], [14, by + 4]], GREY.hi); // drawstrings
    ctx.buf.frame(13, by + 5, 6, 3, GREY.deep); // front pocket
    ctx.buf.rect(14, by + 6, 4, 1, GREY.shade);
  } else if (ctx.view === "left") {
    fill(ctx, new Mask().add(16, by - 2, 5, 4).cut(16, by - 2, 1, 1));
  } else {
    fill(ctx, new Mask().add(12, by - 1, 8, 5).cut(12, by + 3, 1, 1).cut(19, by + 3, 1, 1));
    ctx.buf.rect(14, by + 1, 4, 1, GREY.shade);
  }
};

/** Untinted chest logo drawn over the tinted Espaces hoodie. */
export const hoodieLogo: LayerDraw = (ctx) => {
  if (ctx.view !== "down") return;
  const { by } = fitOf(ctx);
  const mark = hex("#f7d139");
  dots(ctx, [[18, by + 2], [19, by + 2], [18, by + 3], [18, by + 4], [19, by + 4]], mark);
};

export const shirt: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 6, neck: "open" });
  const { by } = g;
  cuffs(ctx, g, 6, GREY.hi);
  collar(ctx, by);
  if (ctx.view === "down") {
    ctx.buf.rect(16, by + 2, 1, 7, GREY.shade);
    dots(ctx, [[15, by + 3], [15, by + 5], [15, by + 7]], GREY.line);
  }
};

export const sweater: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 6, hem: 1 });
  const [tx, ty, tw, th] = g.torso;
  for (let y = ty + 2; y < ty + th - 1; y += 2) rib(ctx, tx + 1 + (y % 4 === 0 ? 1 : 0), y, tw - 2, GREY.shade); // knit
  rib(ctx, tx + 1, ty + th - 1, tw - 2, GREY.deep);
  rib(ctx, tx + 2, ty + th, tw - 3, GREY.deep);
  cuffs(ctx, g, 6, GREY.deep);
  if (ctx.view === "down") ctx.buf.rect(13, ty, 6, 1, GREY.hi); // ribbed neck
  else if (ctx.view === "left") ctx.buf.rect(12, ty, 4, 1, GREY.hi);
  else ctx.buf.rect(13, ty, 6, 1, GREY.light);
};

/** White cotton with a soft grey outline: a near-black line would swallow a three-pixel sleeve. */
const WHITE = { ...fixed("#f4f1ea"), line: hex("#8d8778") };

/** A clean white shirt showing inside an open jacket. */
function innerShirt(ctx: FrameCtx, by: number, depth: number): void {
  if (ctx.view !== "down") return;
  for (let i = 0; i < depth; i++) {
    const half = Math.max(1, 3 - (i >> 1));
    ctx.buf.rect(16 - half, by + i, half * 2, 1, i === 0 ? WHITE.shade : WHITE.base);
  }
}

export const blazer: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 6, hem: 1, neck: "open" });
  const { by } = g;
  cuffs(ctx, g, 6, GREY.deep);
  if (ctx.view === "down") {
    for (let i = 0; i < 5; i++) dots(ctx, [[12 + (i >> 1) + 1, by + i], [19 - (i >> 1) - 1, by + i]], GREY.hi); // lapels
    ctx.buf.rect(16, by + 5, 1, 5, GREY.line); // closure
    dots(ctx, [[15, by + 6]], GREY.hi); // button
    ctx.buf.rect(18, by + 4, 2, 1, GREY.deep); // breast pocket
  } else if (ctx.view === "up") {
    ctx.buf.rect(16, by + 5, 1, 5, GREY.deep); // back vent
  } else {
    ctx.buf.rect(13, by, 2, 3, GREY.hi);
  }
};

export const blazerInner: LayerDraw = (ctx) => {
  const { by } = fitOf(ctx);
  innerShirt(ctx, by, 5);
  if (ctx.view === "down") ctx.buf.rect(15, by + 1, 2, 4, hex("#2a2a29")); // tie
};

export const denimJacket: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 6, neck: "open" });
  const { by } = g;
  const [tx, ty, tw, th] = g.torso;
  cuffs(ctx, g, 6, GREY.hi);
  ctx.buf.rect(tx + 1, ty + th - 2, tw - 2, 1, GREY.deep); // waistband seam
  dots(ctx, [[tx + 2, ty + th - 1], [tx + tw - 3, ty + th - 1]], GREY.hi);
  collar(ctx, by);
  if (ctx.view === "down") {
    ctx.buf.rect(16, by + 2, 1, 6, GREY.line);
    for (const x of [12, 18]) {
      ctx.buf.frame(x, by + 3, 3, 2, GREY.hi); // chest pockets
    }
  } else if (ctx.view === "up") {
    ctx.buf.rect(tx + 2, by + 3, tw - 4, 1, GREY.hi); // yoke
    dots(ctx, [[14, by + 4], [17, by + 4], [14, by + 5], [17, by + 5]], GREY.light);
  }
};

export const denimInner: LayerDraw = (ctx) => innerShirt(ctx, fitOf(ctx).by, 2);

export const vest: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 0, hem: 1, neck: "open" });
  const { by } = g;
  if (ctx.view === "down") {
    ctx.buf.rect(16, by + 4, 1, 6, GREY.line);
    dots(ctx, [[15, by + 5], [15, by + 7]], GREY.hi);
    ctx.buf.rect(12, by + 6, 2, 1, GREY.deep);
    ctx.buf.rect(18, by + 6, 2, 1, GREY.deep);
  } else if (ctx.view === "up") {
    ctx.buf.rect(13, by + 6, 6, 1, GREY.deep); // back belt
  }
};

/** The white shirt under the vest: sleeves and the neck opening. */
export const vestInner: LayerDraw = (ctx) => {
  const g = fitOf(ctx);
  const { by } = g;
  if (g.backArm) {
    const [tx, ty, tw, th] = g.torso;
    fill(ctx, new Mask().add(g.backArm[0], g.backArm[1], g.backArm[2], 6).cut(tx, ty, tw, th + 1), WHITE); // only the part past the vest
  }
  for (const [x, y, w] of g.arms) fill(ctx, new Mask().add(x, y, w, 6), WHITE);
  if (ctx.view === "down") {
    innerShirt(ctx, by, 4);
    dots(ctx, [[13, by], [18, by], [13, by + 1], [18, by + 1]], WHITE.hi);
  }
};
