import type { LayerDraw } from "./anatomy";
import { cuffs, paintRobe } from "./garment";
import { GREY, dots } from "./shader";

/** Full-length modest garments. The manifest marks them as hiding the bottom layer. */

export const longDress: LayerDraw = (ctx) => {
  const g = paintRobe(ctx, { hemY: 29, flareEvery: 3, neck: "crew" });
  const { by } = g;
  cuffs(ctx, g, 6, GREY.hi);
  const [tx, , tw] = g.torso;
  ctx.buf.rect(tx + 1, by + 7, tw - 2, 1, GREY.deep); // fitted waist
  ctx.buf.rect(tx + 1, by + 8, tw - 2, 1, GREY.light);
  if (ctx.view === "down") dots(ctx, [[15, by + 1], [16, by + 1], [15, by + 3], [16, by + 3]], GREY.light); // yoke buttons
};

export const abaya: LayerDraw = (ctx) => {
  const g = paintRobe(ctx, { hemY: 29, flareEvery: 2, cuffFlare: 1, neck: "open" });
  const { by } = g;
  cuffs(ctx, g, 6, GREY.hi);
  if (ctx.view === "down") {
    ctx.buf.rect(15, by + 2, 1, 28 - by - 1, GREY.hi); // open front with a fine trim
    ctx.buf.rect(16, by + 2, 1, 28 - by - 1, GREY.line);
    dots(ctx, [[13, by + 1], [18, by + 1]], GREY.hi);
  } else if (ctx.view === "up") {
    ctx.buf.rect(16, by + 3, 1, 26 - by, GREY.deep); // back seam
  } else {
    ctx.buf.rect(13, by + 2, 1, 27 - by - 1, GREY.hi);
  }
};
