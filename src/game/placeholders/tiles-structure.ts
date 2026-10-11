import { P } from "./palette";
import { type PixelBuffer, shade } from "./pixels";

/** Floors, walls, openings and outdoor ground. Each function paints one 32x32 tile at (x, y). */
export type TileDraw = (b: PixelBuffer, x: number, y: number) => void;

function speckle(b: PixelBuffer, x: number, y: number, seed: number, c: (typeof P)["mist"], n = 10): void {
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    b.set(x + (s % 32), y + ((s >> 8) % 32), c);
  }
}

export const floorA: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.mist);
  b.rect(x, y + 31, 32, 1, P.mistDark);
  b.rect(x + 31, y, 1, 32, P.mistDark);
  speckle(b, x, y, 7, shade(P.mist, 0.95));
};

export const floorB: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.mistDark);
  b.rect(x, y + 31, 32, 1, shade(P.mistDark, 0.93));
  b.rect(x + 31, y, 1, 32, shade(P.mistDark, 0.93));
  speckle(b, x, y, 11, shade(P.mistDark, 0.96));
};

export const carpet: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, shade(P.tealLight, 0.85));
  for (let i = 0; i < 32; i += 4) b.rect(x, y + i, 32, 1, shade(P.tealLight, 0.8));
};

export const rug: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.rugRed);
  b.frame(x + 2, y + 2, 28, 28, P.rugCream);
  b.rect(x + 12, y + 12, 8, 8, P.rugCream);
  b.rect(x + 14, y + 14, 4, 4, P.gold);
};

export const studioFloor: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.charcoal);
  b.rect(x, y + 31, 32, 1, shade(P.charcoal, 0.85));
  b.rect(x + 31, y, 1, 32, shade(P.charcoal, 0.85));
};

export const woodFloor: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.woodLight);
  for (let row = 0; row < 4; row++) {
    const yy = y + row * 8;
    b.rect(x, yy + 7, 32, 1, P.wood);
    b.rect(x + ((row * 13) % 32), yy, 1, 7, P.wood);
    b.rect(x + 2, yy + 2, 10, 1, shade(P.woodLight, 1.06));
  }
};

export const rugHome: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.plum);
  for (let i = 3; i < 32; i += 6) b.rect(x, y + i, 32, 2, shade(P.plum, 1.2));
};

/** Front face of a wall (what you see from inside the room). */
export const wall: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.tealMid);
  b.rect(x, y, 32, 3, P.ink);
  b.rect(x, y + 26, 32, 6, P.teal);
  b.rect(x, y + 26, 32, 1, shade(P.teal, 0.8));
  b.rect(x, y + 31, 32, 1, P.ink);
};

/** Top of a wall seen from above: used for borders and partitions. */
export const wallTop: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.ink);
  b.rect(x + 2, y + 2, 28, 28, P.inkSoft);
  b.rect(x + 2, y + 2, 28, 1, shade(P.inkSoft, 1.25));
};

export const windowTile: TileDraw = (b, x, y) => {
  wall(b, x, y);
  b.rect(x + 4, y + 5, 24, 19, P.white);
  b.rect(x + 6, y + 7, 20, 15, P.sky);
  b.rect(x + 15, y + 7, 2, 15, P.white);
  b.rect(x + 7, y + 8, 5, 1, P.white);
  b.rect(x + 7, y + 9, 3, 1, P.white);
};

export const door: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.mist);
  b.box(x + 3, y, 26, 32, P.woodLight, P.woodDark);
  b.rect(x + 22, y + 15, 3, 2, P.gold);
};

export const glassH: TileDraw = (b, x, y) => {
  b.rect(x, y + 13, 32, 6, P.glass);
  b.rect(x, y + 13, 32, 1, P.glassEdge);
  b.rect(x, y + 18, 32, 1, P.glassEdge);
  b.rect(x + 4, y + 14, 6, 1, P.white);
};

export const glassV: TileDraw = (b, x, y) => {
  b.rect(x + 13, y, 6, 32, P.glass);
  b.rect(x + 13, y, 1, 32, P.glassEdge);
  b.rect(x + 18, y, 1, 32, P.glassEdge);
  b.rect(x + 14, y + 4, 1, 6, P.white);
};

export const grass: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.grass);
  let s = 3;
  for (let i = 0; i < 18; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const gx = x + (s % 31);
    const gy = y + ((s >> 8) % 30);
    b.set(gx, gy, P.grassDark);
    b.set(gx, gy + 1, P.grassDark);
  }
};

export const grassFlowers: TileDraw = (b, x, y) => {
  grass(b, x, y);
  const spots: [number, number][] = [[6, 8], [20, 5], [12, 22], [25, 19]];
  for (const [fx, fy] of spots) {
    b.set(x + fx, y + fy, P.white);
    b.set(x + fx + 1, y + fy, P.gold);
    b.set(x + fx, y + fy + 1, P.coral);
  }
};

export const path: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.path);
  speckle(b, x, y, 5, P.pathDark, 16);
  speckle(b, x, y, 9, shade(P.path, 1.06), 10);
};
