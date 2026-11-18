import { Mask, hex } from "../pixels";
import { type LayerDraw, fitOf } from "./anatomy";
import { cuffs, paintRobe, paintTop, rib } from "./garment";
import { paintScarf } from "./layers-extras";
import { capShape, dome } from "./layers-headwear";
import { dots, fill, fixed, paintOver } from "./shader";

/** Seasonal outfits. They keep their festive colours, so none of them is tintable. */

const RED = fixed("#c2332e");
const SNOW = fixed("#f4f1ea");
const PINE = fixed("#2c6a4f");
const GOLD = fixed("#e0ac2b");
const CREAM = fixed("#efe6d2");
const EMERALD = fixed("#1f6d5a");
const SKY = fixed("#8ed0c6");
const STRAW = fixed("#e4c37c");
const BLACK = fixed("#26262a");
const TEAL = fixed("#2d6372");
const ORANGE = fixed("#faa41a");
const YELLOW = fixed("#f7d139");

export const winterSweater: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 6, hem: 1, tones: RED });
  const [tx, ty, tw, th] = g.torso;
  cuffs(ctx, g, 6, SNOW.base);
  ctx.buf.rect(tx + 1, ty + th - 1, tw - 2, 1, SNOW.base);
  rib(ctx, tx + 1, ty + th, tw - 2, RED.deep);
  if (ctx.view === "left") {
    ctx.buf.rect(tx + 1, ty + 3, tw - 2, 1, SNOW.base);
    ctx.buf.rect(tx + 1, ty + 5, tw - 2, 1, PINE.base);
    return;
  }
  // Snowflake band across the chest.
  ctx.buf.rect(tx + 1, ty + 2, tw - 2, 1, SNOW.base);
  ctx.buf.rect(tx + 1, ty + 6, tw - 2, 1, SNOW.base);
  for (let x = tx + 1; x < tx + tw - 1; x++) ctx.buf.set(x, ty + 4 + ((x % 4 === 1 || x % 4 === 3) ? 0 : x % 4 === 0 ? -1 : 1), PINE.light);
  if (ctx.view === "down") ctx.buf.rect(13, ty, 6, 1, SNOW.base);
};

export const ramadanGalabeya: LayerDraw = (ctx) => {
  const g = paintRobe(ctx, { hemY: 29, flareEvery: 3, cuffFlare: 1, neck: "open", tones: CREAM });
  const { by } = g;
  cuffs(ctx, g, 6, GOLD.base);
  if (ctx.view === "down") {
    ctx.buf.rect(15, by + 2, 2, 6, GOLD.base); // embroidered placket
    for (let y = by + 2; y < by + 8; y += 2) dots(ctx, [[15, y]], GOLD.hi);
    dots(ctx, [[14, by + 1], [17, by + 1], [13, by], [18, by]], GOLD.base);
  } else if (ctx.view === "left") {
    ctx.buf.rect(12, by + 1, 1, 6, GOLD.base);
  } else {
    ctx.buf.rect(14, by, 4, 1, GOLD.base);
  }
  paintOver(ctx, 8, 28, 16, 1, GOLD.base); // embroidered hem
};

export const eidKaftan: LayerDraw = (ctx) => {
  const g = paintRobe(ctx, { hemY: 29, flareEvery: 2, cuffFlare: 1, neck: "open", tones: EMERALD });
  const { by } = g;
  cuffs(ctx, g, 6, GOLD.light);
  const [tx, , tw] = g.torso;
  ctx.buf.rect(tx, by + 7, tw, 2, GOLD.base); // sash
  ctx.buf.rect(tx, by + 8, tw, 1, GOLD.deep);
  if (ctx.view === "down") {
    ctx.buf.rect(15, by + 2, 2, 5, GOLD.light);
    ctx.buf.rect(15, by + 9, 2, 19 - by + 1, GOLD.light); // front panel
    for (let y = by + 10; y < 29; y += 2) dots(ctx, [[15, y]], GOLD.hi);
    dots(ctx, [[13, by + 1], [18, by + 1], [14, by + 2], [17, by + 2]], GOLD.base);
  }
  paintOver(ctx, 6, 28, 20, 1, GOLD.light);
};

export const springShirt: LayerDraw = (ctx) => {
  const g = paintTop(ctx, { sleeve: 3, neck: "open", tones: SKY });
  const { by } = g;
  cuffs(ctx, g, 3, SNOW.base);
  const flowers: [number, number][] = [[12, by + 3], [18, by + 2], [14, by + 6], [19, by + 6], [12, by + 7]];
  for (const [x, y] of flowers) {
    if (ctx.view === "left" && (x < 13 || x > 18)) continue;
    dots(ctx, [[x, y]], YELLOW.base);
    dots(ctx, [[x + 1, y], [x, y + 1]], ORANGE.hi);
  }
  if (ctx.view === "down") {
    dots(ctx, [[13, by], [14, by + 1], [18, by], [17, by + 1]], SNOW.hi);
    ctx.buf.rect(16, by + 2, 1, 7, SKY.deep);
  }
};

export const partyHat: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  const tip = Math.max(2, ht - 2);
  const m = new Mask();
  for (let y = tip; y <= ht + 2; y++) {
    const half = 1 + Math.floor(((y - tip) * 4) / Math.max(1, ht + 2 - tip));
    m.add(16 - half, y, half * 2, 1);
  }
  fill(ctx, m, TEAL);
  for (let y = tip + 1; y <= ht + 1; y += 2) {
    for (let x = 12; x < 20; x++) if (m.has(x - 1, y) && m.has(x + 1, y)) ctx.buf.set(x, y, YELLOW.base);
  }
  fill(ctx, new Mask().add(15, tip - 2, 2, 1).add(14, tip - 1, 4, 1).add(15, tip, 2, 1), RED);
  dots(ctx, [[15, tip - 1]], RED.hi);
};

export const ramadanTaqiyah: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  fill(ctx, new Mask().add(12, ht - 2, 8, 1).add(11, ht - 1, 10, 3), CREAM);
  ctx.buf.rect(11, ht + 1, 10, 1, GOLD.base);
  for (let x = 12; x < 20; x += 2) dots(ctx, [[x, ht]], GOLD.base);
};

export const eidTarboush: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  fill(ctx, new Mask().add(12, ht - 4, 8, 1).add(11, ht - 3, 10, 6), RED);
  ctx.buf.rect(12, ht + 1, 8, 1, RED.deep);
  dots(ctx, [[15, ht - 4], [16, ht - 4]], BLACK.base);
  const tasselX = ctx.view === "left" ? 19 : 20;
  ctx.buf.rect(16, ht - 4, tasselX - 16, 1, BLACK.base);
  ctx.buf.rect(tasselX, ht - 4, 1, 5, BLACK.base);
  ctx.buf.rect(tasselX, ht + 1, 2, 2, BLACK.deep);
};

export const springHat: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  fill(ctx, dome(new Mask(), ht, 3), STRAW);
  fill(ctx, new Mask().add(6, ht + 2, 20, 3).cut(6, ht + 2, 1, 1).cut(25, ht + 2, 1, 1), STRAW);
  ctx.buf.rect(10, ht + 1, 12, 1, PINE.base); // ribbon
  ctx.buf.rect(10, ht + 2, 12, 1, PINE.deep);
  dots(ctx, [[19, ht], [20, ht], [19, ht + 1]], ORANGE.base);
  for (let x = 8; x < 24; x += 3) dots(ctx, [[x, ht + 3]], STRAW.shade);
};

export const egyptCap: LayerDraw = (ctx) => {
  const { ht } = fitOf(ctx);
  capShape(ctx, ht, BLACK);
  // Flag bands across the crown, keeping the outline.
  for (let y = ht - 1; y <= ht + 2; y++) {
    const band = y < ht ? RED.base : y < ht + 2 ? SNOW.base : BLACK.base;
    ctx.buf.rect(11, y, 10, 1, band);
  }
  if (ctx.view !== "up") dots(ctx, [[15, ht], [16, ht], [15, ht + 1], [16, ht + 1]], GOLD.base);
};

export const winterScarf: LayerDraw = (ctx) => paintScarf(ctx, RED, (_x, y) => (y % 3 === 0 ? SNOW.base : null));

export const egyptScarf: LayerDraw = (ctx) =>
  paintScarf(ctx, BLACK, (_x, y) => (y % 3 === 0 ? RED.base : y % 3 === 1 ? SNOW.base : null));

const GLOW = hex("#ffd86a70");

export const ramadanLantern: LayerDraw = (ctx) => {
  const { hands } = fitOf(ctx);
  const hand = hands[hands.length - 1];
  const cx = ctx.view === "left" ? hand[0] - 2 : hand[0] + 3;
  const top = hand[1] + 1;
  dots(ctx, [[cx - 2, top + 3], [cx - 2, top + 4], [cx - 2, top + 5], [cx + 4, top + 3], [cx + 4, top + 4], [cx + 4, top + 5]], GLOW);
  ctx.buf.rect(cx + 1, top - 1, 1, 2, GOLD.line); // ring
  fill(ctx, new Mask().add(cx, top + 1, 3, 1).add(cx - 1, top + 2, 5, 1), GOLD);
  fill(ctx, new Mask().add(cx - 1, top + 3, 5, 3), TEAL);
  ctx.buf.rect(cx, top + 4, 3, 1, YELLOW.hi);
  dots(ctx, [[cx + 1, top + 3], [cx + 1, top + 5]], ORANGE.base);
  fill(ctx, new Mask().add(cx - 1, top + 6, 5, 1).add(cx, top + 7, 3, 1), GOLD);
};

export const eidBalloon: LayerDraw = (ctx) => {
  const { hands } = fitOf(ctx);
  const hand = hands[hands.length - 1];
  const hx = ctx.view === "left" ? hand[0] : hand[0] + 2;
  const bx = ctx.view === "left" ? 4 : 25;
  const by = 1 + (ctx.pose.bob ? 1 : 0);
  const m = new Mask().add(bx - 2, by, 5, 1).add(bx - 3, by + 1, 7, 5).add(bx - 2, by + 6, 5, 1).add(bx - 1, by + 7, 3, 1);
  fill(ctx, m, ORANGE);
  dots(ctx, [[bx - 2, by + 2], [bx - 1, by + 1], [bx - 1, by + 2]], ORANGE.hi);
  dots(ctx, [[bx, by + 8]], ORANGE.deep);
  // String from the balloon down to the hand.
  const from = by + 9;
  const to = hand[1];
  for (let y = from; y <= to; y++) {
    const f = (y - from) / Math.max(1, to - from);
    ctx.buf.set(Math.round(bx + (hx - bx) * f), y, SNOW.shade);
  }
};
