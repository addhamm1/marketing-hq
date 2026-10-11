import { hex } from "../pixels";
import { EYE, type FrameCtx, type LayerDraw, TINT, TINT_DETAIL, TINT_LIGHT, geometry, maskOf } from "./anatomy";

/** body, bottom, top and shoes layers. */

function body(build: "slim" | "broad"): LayerDraw {
  return ({ buf, view, pose }) => {
    const g = geometry(view, pose, build);
    const m = maskOf([g.torso, ...g.arms, ...g.hands, ...g.legs, ...g.feet, [13, g.ht + 11, 6, 2]]);
    m.addRounded(...g.head);
    if (view === "left") m.add(9, g.ht + 7, 1, 2); // nose
    m.paint(buf, 0, 0, TINT);
    for (const [x, y] of g.eyes) buf.rect(x, y, 1, 2, EYE);
    if (view === "left") buf.rect(17, g.ht + 5, 2, 3, TINT.outline); // ear
    if (view === "down") buf.rect(15, g.ht + 9, 2, 1, TINT.outline); // mouth
  };
}

export const bodyB1 = body("slim");
export const bodyB2 = body("broad");

function hip({ view, pose }: FrameCtx) {
  const t = geometry(view, pose, "fit").torso;
  return [t[0], 23, t[2], 2] as const;
}

export const pants: LayerDraw = (ctx) => {
  const g = geometry(ctx.view, ctx.pose, "fit");
  maskOf([hip(ctx), ...g.legs]).paint(ctx.buf, 0, 0, TINT);
};

export const shorts: LayerDraw = (ctx) => {
  const g = geometry(ctx.view, ctx.pose, "fit");
  maskOf([hip(ctx), ...g.legs.map(([x, y, w]) => [x, y, w, 3] as const)]).paint(ctx.buf, 0, 0, TINT);
};

export const skirt: LayerDraw = (ctx) => {
  const [x, , w] = hip(ctx);
  const m = maskOf([[x, 22, w, 2], [x - 1, 24, w + 2, 2], [x - 2, 26, w + 4, 2]]);
  m.paint(ctx.buf, 0, 0, TINT);
  for (let i = x; i < x + w; i += 3) ctx.buf.set(i, 26, TINT.shadow); // pleats
};

/** Shared torso + sleeves; `sleeve` is how many rows of arm the sleeve covers. */
function torsoMask(ctx: FrameCtx, sleeve: number, hem = 0) {
  const g = geometry(ctx.view, ctx.pose, "fit");
  const [tx, ty, tw, th] = g.torso;
  return { g, m: maskOf([[tx, ty, tw, th + hem], ...g.arms.map(([x, y, w]) => [x, y, w, sleeve] as const)]) };
}

export const tshirt: LayerDraw = (ctx) => {
  const { g, m } = torsoMask(ctx, 3);
  m.paint(ctx.buf, 0, 0, TINT);
  if (ctx.view === "down") ctx.buf.rect(14, g.torso[1], 4, 1, TINT.outline); // neckline
};

export const hoodie: LayerDraw = (ctx) => {
  const { g, m } = torsoMask(ctx, 6, 1);
  const ht = g.ht;
  if (ctx.view === "up") m.add(11, ht + 9, 10, 4); // hood resting on the back
  else if (ctx.view === "down") m.add(12, ht + 11, 8, 2);
  else m.add(16, ht + 9, 5, 4);
  m.paint(ctx.buf, 0, 0, TINT);
  const [tx, ty, tw] = g.torso;
  if (ctx.view === "down") {
    ctx.buf.rect(tx + 2, ty + 6, tw - 4, 1, TINT_DETAIL); // pocket
    ctx.buf.set(14, ty + 1, TINT_LIGHT); // drawstrings
    ctx.buf.set(17, ty + 1, TINT_LIGHT);
    ctx.buf.set(14, ty + 2, TINT_LIGHT);
    ctx.buf.set(17, ty + 2, TINT_LIGHT);
  }
};

/** Untinted chest logo drawn over the tinted Espaces hoodie. */
export const hoodieLogo: LayerDraw = ({ buf, view, pose }) => {
  if (view !== "down") return;
  const ty = geometry(view, pose, "fit").torso[1];
  const white = hex("#f7f6f2");
  const accent = hex("#e0b25a");
  const rows = ["###", "#..", "##.", "###"];
  rows.forEach((row, y) => [...row].forEach((c, x) => c === "#" && buf.set(17 + x, ty + 2 + y, white)));
  buf.set(20, ty + 5, accent);
};

export const shirt: LayerDraw = (ctx) => {
  const { g, m } = torsoMask(ctx, 6);
  m.paint(ctx.buf, 0, 0, TINT);
  const [, ty, , th] = g.torso;
  if (ctx.view === "down") {
    ctx.buf.rect(16, ty + 1, 1, th - 2, TINT_DETAIL); // placket
    for (let y = ty + 2; y < ty + th - 1; y += 2) ctx.buf.set(15, y, TINT.outline); // buttons
    ctx.buf.rect(13, ty, 2, 2, TINT_LIGHT); // collar
    ctx.buf.rect(17, ty, 2, 2, TINT_LIGHT);
  }
};

export const blazer: LayerDraw = (ctx) => {
  const { g, m } = torsoMask(ctx, 6, 1);
  m.paint(ctx.buf, 0, 0, TINT);
  const [, ty] = g.torso;
  if (ctx.view === "down") {
    for (let i = 0; i < 4; i++) {
      ctx.buf.rect(13 + i, ty + i, 1, 1, TINT_DETAIL); // lapels
      ctx.buf.rect(18 - i, ty + i, 1, 1, TINT_DETAIL);
    }
    ctx.buf.rect(14, ty, 4, 1, TINT_LIGHT);
    ctx.buf.rect(15, ty + 1, 2, 2, TINT_LIGHT); // shirt underneath
    ctx.buf.set(16, ty + 5, TINT.outline);
    ctx.buf.set(16, ty + 7, TINT.outline);
  } else if (ctx.view === "up") {
    ctx.buf.rect(16, ty + 4, 1, 6, TINT_DETAIL); // back vent
  }
};

export const sneakers: LayerDraw = (ctx) => {
  const g = geometry(ctx.view, ctx.pose, "fit");
  maskOf(g.feet).paint(ctx.buf, 0, 0, TINT);
  for (const [x, y, w, h] of g.feet) ctx.buf.rect(x + 1, y + h - 1, w - 2, 1, TINT_LIGHT); // sole
};

export const boots: LayerDraw = (ctx) => {
  const g = geometry(ctx.view, ctx.pose, "fit");
  const shafts = g.feet.map(([x, y, w]) => {
    const legX = ctx.view === "left" ? x + 2 : x;
    return [legX, y - 2, ctx.view === "left" ? w - 2 : w - 1, 2] as const;
  });
  maskOf([...g.feet, ...shafts]).paint(ctx.buf, 0, 0, TINT);
  for (const [x, y, w] of shafts) ctx.buf.rect(x + 1, y, Math.max(1, w - 2), 1, TINT_DETAIL); // cuff
};
