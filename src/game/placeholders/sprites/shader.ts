import { TONE_LEVELS, toneRamp, type RampKind, type ToneName } from "../../avatar/tint";
import type { Mask, RGBA } from "../pixels";
import type { FrameCtx } from "./anatomy";

/**
 * One light for every sprite: from the upper left of the screen. Each shape gets
 * a dark outline, a lit upper-left bevel and a shaded lower-right bevel.
 */

export type Tones = Record<ToneName, RGBA>;

const grey = (v: number): RGBA => [v, v, v, 255];

/** Grey tones for tintable layers: the compositor maps these to the chosen colour. */
export const GREY: Tones = {
  line: grey(TONE_LEVELS.line),
  deep: grey(TONE_LEVELS.deep),
  shade: grey(TONE_LEVELS.shade),
  base: grey(TONE_LEVELS.base),
  light: grey(TONE_LEVELS.light),
  hi: grey(TONE_LEVELS.hi),
};

/** Fixed-colour tones for parts that are never tinted. */
export function fixed(color: string, kind: RampKind = "clothing"): Tones {
  const ramp = toneRamp(color, kind);
  const rgba = (name: ToneName): RGBA => [...ramp[name], 255];
  return { line: rgba("line"), deep: rgba("deep"), shade: rgba("shade"), base: rgba("base"), light: rgba("light"), hi: rgba("hi") };
}

/** The same tones one step darker: for the far arm and other parts turned away from the light. */
export function dimmed(t: Tones): Tones {
  return { line: t.line, deep: t.line, shade: t.deep, base: t.shade, light: t.base, hi: t.light };
}

/** Paint a shape with outline and directional shading. */
export function fill(ctx: FrameCtx, m: Mask, t: Tones = GREY): void {
  const lit = ctx.mirrored ? 1 : -1;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      if (!m.has(x, y)) continue;
      if (!m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1)) {
        ctx.buf.set(x, y, t.line);
        continue;
      }
      const top = !m.has(x, y - 2);
      const bottom = !m.has(x, y + 2);
      const near = !m.has(x + lit * 2, y);
      const far = !m.has(x - lit * 2, y);
      const score = (top === bottom ? 0 : top ? 1 : -1) + (near === far ? 0 : near ? 1 : -1);
      ctx.buf.set(x, y, score >= 2 ? t.hi : score === 1 ? t.light : score === 0 ? t.base : score === -1 ? t.shade : t.deep);
    }
  }
}

/** Plot single pixels. */
export function dots(ctx: FrameCtx, points: readonly (readonly [number, number])[], c: RGBA): void {
  for (const [x, y] of points) ctx.buf.set(x, y, c);
}

/** Plot only where something is already painted, so details never spill past a silhouette. */
export function paintOver(ctx: FrameCtx, x: number, y: number, w: number, h: number, c: RGBA): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (ctx.buf.alpha(xx, yy) > 0) ctx.buf.set(xx, yy, c);
}
