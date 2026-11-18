import { Mask, type PixelBuffer } from "../pixels";

/**
 * Shared rig for the characters (32x32 frames, chibi proportions). Every layer
 * is drawn from the same geometry so the layers line up.
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
  /** Top row of the head (includes the bob). */
  ht: number;
  /** Shoulder row (includes the bob). */
  by: number;
  torso: Rect;
  /** Arms painted over the torso, with the matching hands. */
  arms: Rect[];
  hands: Rect[];
  /** Side view only: the far arm, painted behind the torso. */
  backArm: Rect | null;
  backHand: Rect | null;
  /** Far leg first, so the near leg paints over it. */
  legs: Rect[];
  feet: Rect[];
};

function sideGeometry(pose: Pose, build: Build): Geometry {
  const ht = 4 + pose.bob;
  const by = 16 + pose.bob;
  const armW = build === "slim" ? 3 : 4;
  const armX = 14 + (build === "slim" ? 1 : 0);
  const swing = pose.stride * 2;
  const arm = (x: number): Rect => [x, by + 1, armW, 6];
  const hand = (x: number): Rect => [x, by + 7, armW, 2];
  const walking = pose.stride !== 0;
  const nearX = pose.stride === 1 ? 11 : 17;
  const farX = pose.stride === 1 ? 17 : 11;
  const legs: Rect[] = walking
    ? [[farX, 24, 4, farX > nearX ? 4 : 5], [nearX, 24, 4, nearX > farX ? 4 : 5]]
    : [[13, 24, 6, 5]];
  return {
    ht,
    by,
    torso: [build === "slim" ? 13 : 12, by, build === "slim" ? 7 : 8, 9],
    arms: [arm(armX - swing)],
    hands: [hand(armX - swing)],
    backArm: walking ? arm(armX + swing) : null,
    backHand: walking ? hand(armX + swing) : null,
    legs,
    feet: legs.map(([x, y, w, h]) => [x - 2, y + h, w + 2, 2] as const),
  };
}

export function geometry(view: View, pose: Pose, build: Build): Geometry {
  if (view === "left") return sideGeometry(pose, build);
  const ht = 4 + pose.bob;
  const by = 16 + pose.bob;
  const slim = build === "slim";
  const armY = (side: number) => by + 1 + pose.stride * side;
  const armXs = slim ? [9, 20] : [8, 21];
  const arms = armXs.map((x, i): Rect => [x, armY(i === 0 ? 1 : -1), 3, 6]);
  const legX = slim ? [12, 17] : [11, 17];
  const legW = slim ? 3 : 4;
  const lift = [pose.stride === 1 ? 1 : 0, pose.stride === -1 ? 1 : 0];
  const legs = legX.map((x, i): Rect => [x, 24, legW, 5 - lift[i]]);
  return {
    ht,
    by,
    torso: slim ? [12, by, 8, 9] : [11, by, 10, 9],
    arms,
    hands: arms.map(([x, y, w, h]): Rect => [x, y + h, w, 2]),
    backArm: null,
    backHand: null,
    legs,
    feet: legs.map(([x, y, w, h], i): Rect => [i === 0 ? x - 1 : x, y + h, w + 1, 2]),
  };
}

/** Everything a layer needs to draw one frame. `mirrored` frames are flipped afterwards, so their light comes from the other side. */
export type FrameCtx = { buf: PixelBuffer; view: View; pose: Pose; mirrored: boolean };

export type LayerDraw = (ctx: FrameCtx) => void;

export function maskOf(rects: readonly Rect[]): Mask {
  const m = new Mask();
  for (const r of rects) m.add(...r);
  return m;
}

/** The fit-envelope geometry for a frame. */
export function fitOf(ctx: FrameCtx): Geometry {
  return geometry(ctx.view, ctx.pose, "fit");
}

/** Head silhouette. The slim build has a softer jaw, the broad build a squarer one. */
export function headMask(view: View, ht: number, build: Build): Mask {
  const m = new Mask();
  m.add(12, ht, 8, 1).add(11, ht + 1, 10, 1).add(10, ht + 2, 12, 7);
  if (view === "left") {
    m.add(10, ht + 9, 11, 1).add(11, ht + 10, 9, 1).add(12, ht + 11, 6, 1);
    m.add(9, ht + 6, 1, 2); // nose
    return m;
  }
  if (build === "slim") m.add(11, ht + 9, 10, 1).add(12, ht + 10, 8, 1).add(14, ht + 11, 4, 1);
  else m.add(10, ht + 9, 12, 1).add(11, ht + 10, 10, 1).add(13, ht + 11, 6, 1);
  return m;
}
