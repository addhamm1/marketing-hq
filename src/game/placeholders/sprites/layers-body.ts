import { hex } from "../pixels";
import { type Build, type FrameCtx, type LayerDraw, geometry, headMask, maskOf } from "./anatomy";
import { GREY, dimmed, dots, fill } from "./shader";

/** The body layer (tinted with the skin tone) and its untinted face detail. */

function drawLimbs(ctx: FrameCtx, build: Build): void {
  const g = geometry(ctx.view, ctx.pose, build);
  if (g.backArm && g.backHand) fill(ctx, maskOf([g.backArm, g.backHand]), dimmed(GREY));
  g.legs.forEach((leg, i) => fill(ctx, maskOf([leg, g.feet[i]]), i === 0 && g.legs.length > 1 ? dimmed(GREY) : GREY));
  fill(ctx, maskOf([g.torso]));
  g.arms.forEach((arm, i) => fill(ctx, maskOf([arm, g.hands[i]])));
}

function body(build: "slim" | "broad"): LayerDraw {
  return (ctx) => {
    drawLimbs(ctx, build);
    const { ht } = geometry(ctx.view, ctx.pose, build);
    fill(ctx, headMask(ctx.view, ht, build));
    if (ctx.view === "down") {
      dots(ctx, [[15, ht + 8], [16, ht + 8]], GREY.shade); // nose shadow
      dots(ctx, [[15, ht + 10], [16, ht + 10]], GREY.deep); // mouth
    } else if (ctx.view === "left") {
      ctx.buf.rect(17, ht + 5, 2, 3, GREY.shade); // ear
      ctx.buf.rect(18, ht + 5, 1, 3, GREY.deep);
      dots(ctx, [[10, ht + 10], [11, ht + 10]], GREY.deep); // mouth
    } else {
      dots(ctx, [[10, ht + 6], [21, ht + 6]], GREY.deep); // ears from behind
    }
  };
}

export const bodyB1 = body("slim");
export const bodyB2 = body("broad");

const PUPIL = hex("#241c26");
const CATCHLIGHT = hex("#ffffff");
const BROW = hex("#2a1c1878");
const BLUSH = hex("#e8665a50");

/** Eyes, brows and blush: drawn untinted so the face reads on every skin tone. */
export const faceDetail: LayerDraw = (ctx) => {
  const { ht } = geometry(ctx.view, ctx.pose, "fit");
  const eye = ht + 6;
  if (ctx.view === "down") {
    for (const x of [12, 18]) {
      ctx.buf.rect(x, eye, 2, 3, PUPIL);
      ctx.buf.set(x, eye, CATCHLIGHT);
      ctx.buf.rect(x, eye - 2, 2, 1, BROW);
    }
    dots(ctx, [[11, ht + 9], [20, ht + 9]], BLUSH);
  } else if (ctx.view === "left") {
    ctx.buf.rect(11, eye, 2, 3, PUPIL);
    ctx.buf.set(11, eye, CATCHLIGHT);
    ctx.buf.rect(11, eye - 2, 2, 1, BROW);
    ctx.buf.set(14, ht + 9, BLUSH);
  }
};
