import { Mask, type Paint, type PixelBuffer, hex } from "../pixels";

/**
 * Shared rig for the placeholder characters (32x32 frames, chibi proportions).
 * Every layer is drawn from the same geometry so the layers line up.
 *
 * "fit" is the envelope clothing is drawn to: wide enough to cover both builds.
 */

export type View = "down" | "left" | "up";
export type Build = "slim" | "broad" | "fit";
export type Rect = readonly [x: number, y: number, w: number, h: number];
export type Pose = { bob: 0 | 1; stride: -1 | 0 | 1 };

/** Columns 0-1 idle (breathing bob), 2-5 walk cycle. */
export const POSES: readonly Pose[] = [
  { bob: 0, stride: 0 },
  { bob: 1, stride: 0 },
  { bob: 0, stride: 1 },
  { bob: 1, stride: 0 },
  { bob: 0, stride: -1 },
  { bob: 1, stride: 0 },
];

export type Geometry = {
  /** Top row of the head box (includes the bob). */
  ht: number;
  head: Rect;
  torso: Rect;
  arms: Rect[];
  hands: Rect[];
  legs: Rect[];
  feet: Rect[];
  eyes: [number, number][];
};

export function geometry(view: View, pose: Pose, build: Build): Geometry {
  const ht = 4 + pose.bob;
  const b = pose.bob;
  const head: Rect = [10, ht, 12, 12];
  if (view === "left") {
    const torsoW = build === "slim" ? 8 : 10;
    const armW = build === "slim" ? 3 : 4;
    const armX = (build === "slim" ? 14 : 13) - pose.stride * 2;
    const legW = build === "slim" ? 3 : 4;
    const legs: Rect[] = pose.stride === 0 ? [[13, 24, legW, 5]] : [[11, 24, legW, 5], [17, 24, legW, 5]];
    return {
      ht,
      head,
      torso: [build === "slim" ? 12 : 11, 16 + b, torsoW, 9],
      arms: [[armX, 17 + b, armW, 6]],
      hands: [[armX, 23 + b, armW, 2]],
      legs,
      feet: legs.map(([x, , w]) => [x - 2, 29, w + 2, 2] as const),
      eyes: [[12, ht + 6]],
    };
  }
  const slim = build === "slim";
  const torso: Rect = slim ? [11, 16 + b, 10, 9] : [10, 16 + b, 12, 9];
  const armW = build === "fit" ? 3 : 2;
  const leftArmX = slim ? 9 : 8;
  const rightArmX = slim ? 21 : build === "fit" ? 21 : 22;
  const legW = slim ? 3 : 4;
  const legX = slim ? [12, 17] : [11, 17];
  const lift = [pose.stride === 1 ? 1 : 0, pose.stride === -1 ? 1 : 0];
  const legs: Rect[] = legX.map((x, i) => [x, 24, legW, 5 - lift[i]] as const);
  return {
    ht,
    head,
    torso,
    arms: [
      [leftArmX, 17 + b + pose.stride, armW, 6],
      [rightArmX, 17 + b - pose.stride, armW, 6],
    ],
    hands: [
      [slim ? 9 : 8, 23 + b + pose.stride, 2, 2],
      [slim ? 21 : 22, 23 + b - pose.stride, 2, 2],
    ],
    legs,
    feet: legs.map(([x, , w], i) => [i === 0 ? x - 1 : x, 29 - lift[i], w + 1, 2] as const),
    eyes: view === "down" ? [[13, ht + 6], [18, ht + 6]] : [],
  };
}

/** Light greys for tintable layers: a multiply tint turns them into the chosen colour with shading. */
export const TINT: Paint = { base: hex("#f2f2f2"), shadow: hex("#cdcdcd"), outline: hex("#8a8a8a"), light: hex("#ffffff") };
export const TINT_DETAIL = hex("#a9a9a9");
export const TINT_LIGHT = hex("#ffffff");
export const EYE = hex("#1b1b1f");

/** Everything a layer needs to draw one frame. */
export type FrameCtx = { buf: PixelBuffer; view: View; pose: Pose };

export type LayerDraw = (ctx: FrameCtx) => void;

export function maskOf(rects: readonly Rect[]): Mask {
  const m = new Mask();
  for (const r of rects) m.add(...r);
  return m;
}
