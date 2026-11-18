import { Mask } from "../pixels";
import { type FrameCtx, type Geometry, type Rect, fitOf, maskOf } from "./anatomy";
import { GREY, type Tones, dimmed, fill, paintOver } from "./shader";

/** Cut-and-sew helpers shared by the everyday tops and the seasonal outfits. */

export type TopSpec = {
  /** Rows of arm the sleeve covers: 3 is short, 6 reaches the wrist, 0 is sleeveless. */
  sleeve: number;
  /** Extra rows below the waist. */
  hem?: number;
  /** "crew" shows one row of neck, "open" shows two, "high" closes at the throat. */
  neck?: "crew" | "open" | "high";
  tones?: Tones;
};

function sleeveMask(arm: Rect, rows: number, ctx: FrameCtx, side: number, flare = 0): Mask {
  const [x, y, w] = arm;
  const m = maskOf([[x, y, w, rows]]);
  if (ctx.view !== "left") m.add(side < 0 ? x + 1 : x, y - 1, w - 1, 1); // rounded shoulder
  if (flare > 0) m.add(side < 0 ? x - flare : x, y + rows - 2, w + flare, 2); // loose cuff
  return m;
}

/**
 * Where a sleeve lies against the torso, two outlines would meet and read as a
 * black stripe on bright fabric. Keep the dark line for the silhouette only.
 */
function softenSeam(ctx: FrameCtx, g: Geometry, arm: Rect, side: number, rows: number, t: Tones): void {
  const [tx, , tw] = g.torso;
  const [x, y, w] = arm;
  const armEdge = side < 0 ? x + w - 1 : x;
  const torsoEdge = side < 0 ? tx : tx + tw - 1;
  for (let row = y; row < y + rows - 1; row++) {
    ctx.buf.set(armEdge, row, t.deep);
    ctx.buf.set(torsoEdge, row, t.shade);
  }
}

function paintSleeves(ctx: FrameCtx, g: Geometry, rows: number, t: Tones, flare = 0): void {
  if (rows <= 0) return;
  g.arms.forEach((arm, i) => {
    const side = i === 0 ? -1 : 1;
    fill(ctx, sleeveMask(arm, rows, ctx, side, flare), t);
    if (ctx.view !== "left") softenSeam(ctx, g, arm, side, rows, t);
  });
}

function torsoMask(g: Geometry, ctx: FrameCtx, hem: number, neck: TopSpec["neck"]): Mask {
  const [tx, ty, tw, th] = g.torso;
  const m = new Mask().add(tx + 1, ty, tw - 2, 1).add(tx, ty + 1, tw, th - 1 + hem);
  if (ctx.view === "down" && neck !== "high") m.cut(14, ty, 4, neck === "open" ? 2 : 1);
  return m;
}

/** Torso and sleeves. Returns the geometry so callers can place details. */
export function paintTop(ctx: FrameCtx, spec: TopSpec): Geometry {
  const g = fitOf(ctx);
  const t = spec.tones ?? GREY;
  if (g.backArm && spec.sleeve > 0) fill(ctx, sleeveMask(g.backArm, spec.sleeve, ctx, 1), dimmed(t));
  fill(ctx, torsoMask(g, ctx, spec.hem ?? 0, spec.neck), t);
  paintSleeves(ctx, g, spec.sleeve, t);
  return g;
}

export type RobeSpec = {
  /** Last painted row of the hem. */
  hemY: number;
  /** Widen by one pixel per side every n rows below the waist. */
  flareEvery?: number;
  /** Extra width at the cuff, for loose sleeves. */
  cuffFlare?: number;
  neck?: TopSpec["neck"];
  tones?: Tones;
  /** Fold lines in the skirt of the garment. */
  folds?: boolean;
};

/** Full-length garment from shoulder to ankle, with a hem that sways on the stride. */
export function paintRobe(ctx: FrameCtx, spec: RobeSpec): Geometry {
  const g = fitOf(ctx);
  const t = spec.tones ?? GREY;
  const flareEvery = spec.flareEvery ?? 3;
  const [tx, ty, tw] = g.torso;
  const waist = ty + 8;
  const m = torsoMask(g, ctx, 0, spec.neck);
  for (let y = waist; y <= spec.hemY; y++) {
    const spread = Math.floor((y - waist) / flareEvery) + 1;
    const sway = y >= spec.hemY - 1 ? ctx.pose.stride : 0;
    m.add(tx - spread + sway, y, tw + spread * 2, 1);
  }
  if (g.backArm) fill(ctx, sleeveMask(g.backArm, 6, ctx, 1), dimmed(t));
  fill(ctx, m, t);
  if (spec.folds !== false) {
    for (const x of ctx.view === "left" ? [14, 17] : [13, 18]) paintOver(ctx, x, waist + 1, 1, spec.hemY - waist - 1, t.shade);
  }
  paintSleeves(ctx, g, 6, t, spec.cuffFlare ?? 0);
  return g;
}

/** A darker band across each sleeve end. */
export function cuffs(ctx: FrameCtx, g: Geometry, rows: number, c: Tones[keyof Tones]): void {
  for (const [x, y, w] of g.arms) ctx.buf.rect(x + 1, y + rows - 2, Math.max(1, w - 2), 1, c);
}

/** Alternating rib dots along a row, for knit hems and cuffs. */
export function rib(ctx: FrameCtx, x: number, y: number, w: number, c: Tones[keyof Tones]): void {
  for (let i = x; i < x + w; i += 2) ctx.buf.set(i, y, c);
}
