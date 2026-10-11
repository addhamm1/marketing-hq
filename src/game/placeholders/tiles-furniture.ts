import { P } from "./palette";
import { shade } from "./pixels";
import type { TileDraw } from "./tiles-structure";

/** Everyday furniture. Transparent background so they sit on any floor. */

export const desk: TileDraw = (b, x, y) => {
  b.rect(x + 2, y + 25, 28, 3, P.shadow);
  b.box(x + 1, y + 6, 30, 19, P.oak, P.woodDark);
  b.rect(x + 3, y + 25, 2, 6, P.woodDark);
  b.rect(x + 27, y + 25, 2, 6, P.woodDark);
  // monitor
  b.box(x + 9, y + 1, 14, 11, P.charcoal, P.ink);
  b.rect(x + 11, y + 3, 10, 6, P.tealLight);
  b.rect(x + 15, y + 12, 2, 2, P.charcoal);
  // keyboard and mug
  b.rect(x + 10, y + 16, 12, 4, P.mist);
  b.frame(x + 10, y + 16, 12, 4, P.greyDark);
  b.rect(x + 25, y + 14, 3, 4, P.white);
};

export const chair: TileDraw = (b, x, y) => {
  b.box(x + 8, y + 2, 16, 8, P.teal, P.ink); // backrest
  b.box(x + 7, y + 9, 18, 12, P.tealMid, P.ink); // seat
  b.rect(x + 15, y + 21, 2, 6, P.charcoal);
  b.rect(x + 9, y + 27, 14, 2, P.charcoal);
  b.set(x + 9, y + 29, P.ink);
  b.set(x + 22, y + 29, P.ink);
};

export const plant: TileDraw = (b, x, y) => {
  b.box(x + 10, y + 20, 12, 10, P.pot, shade(P.pot, 0.6));
  b.rect(x + 8, y + 6, 16, 14, P.leaf);
  b.rect(x + 11, y + 3, 10, 4, P.leaf);
  b.rect(x + 6, y + 10, 4, 6, P.leafDark);
  b.rect(x + 22, y + 9, 4, 7, P.leafDark);
  b.rect(x + 12, y + 7, 3, 3, P.leafLight);
  b.rect(x + 18, y + 12, 3, 3, P.leafLight);
  b.rect(x + 9, y + 18, 14, 2, P.leafDark);
};

/** Horizontally repeatable table segment (no side edges so tiles join seamlessly). */
export const meetingTable: TileDraw = (b, x, y) => {
  b.rect(x, y + 4, 32, 24, P.wood);
  b.rect(x, y + 4, 32, 1, P.woodDark);
  b.rect(x, y + 5, 32, 2, shade(P.wood, 1.15));
  b.rect(x, y + 26, 32, 1, shade(P.wood, 0.8));
  b.rect(x, y + 27, 32, 1, P.woodDark);
  b.rect(x + 6, y + 12, 8, 6, P.white); // notes
  b.rect(x + 20, y + 14, 4, 4, P.charcoal); // phone
};

export const sofa: TileDraw = (b, x, y) => {
  b.box(x + 1, y + 4, 30, 10, P.teal, P.ink);
  b.box(x + 1, y + 12, 30, 14, P.tealMid, P.ink);
  b.box(x, y + 8, 5, 18, P.teal, P.ink);
  b.box(x + 27, y + 8, 5, 18, P.teal, P.ink);
  b.rect(x + 16, y + 14, 1, 10, P.teal);
};

export const couch: TileDraw = (b, x, y) => {
  b.box(x + 1, y + 4, 30, 10, P.rugRed, shade(P.rugRed, 0.55));
  b.box(x + 1, y + 12, 30, 14, shade(P.rugRed, 1.15), shade(P.rugRed, 0.55));
  b.box(x, y + 8, 5, 18, P.rugRed, shade(P.rugRed, 0.55));
  b.box(x + 27, y + 8, 5, 18, P.rugRed, shade(P.rugRed, 0.55));
  b.box(x + 7, y + 8, 7, 6, P.cream, P.woodDark); // cushion
};

export const bookshelf: TileDraw = (b, x, y) => {
  b.box(x + 1, y, 30, 31, P.woodDark, P.ink);
  const colours = [P.teal, P.coral, P.cream, P.gold, P.tealLight, P.plum];
  for (let row = 0; row < 3; row++) {
    const yy = y + 3 + row * 9;
    b.rect(x + 3, yy + 7, 26, 1, P.wood);
    for (let i = 0; i < 8; i++) {
      const h = 5 + ((i + row) % 3);
      b.rect(x + 4 + i * 3, yy + 7 - h, 2, h, colours[(i + row * 2) % colours.length]);
    }
  }
};

export const bedHead: TileDraw = (b, x, y) => {
  b.box(x + 2, y + 1, 28, 6, P.woodDark, P.ink);
  b.rect(x + 3, y + 7, 26, 25, P.white);
  b.rect(x + 3, y + 7, 1, 25, P.greyDark);
  b.rect(x + 28, y + 7, 1, 25, P.greyDark);
  b.box(x + 6, y + 9, 20, 9, P.cream, P.grey); // pillow
  b.rect(x + 3, y + 22, 26, 10, P.tealLight);
  b.rect(x + 3, y + 22, 26, 1, P.teal);
};

export const bedFoot: TileDraw = (b, x, y) => {
  b.rect(x + 3, y, 26, 26, P.tealLight);
  b.rect(x + 3, y, 1, 26, P.teal);
  b.rect(x + 28, y, 1, 26, P.teal);
  for (let i = 4; i < 24; i += 6) b.rect(x + 4, y + i, 24, 1, shade(P.tealLight, 0.9));
  b.box(x + 2, y + 25, 28, 5, P.woodDark, P.ink);
};

export const cafeTable: TileDraw = (b, x, y) => {
  b.rect(x + 15, y + 18, 2, 10, P.charcoal);
  b.rect(x + 10, y + 27, 12, 2, P.charcoal);
  b.box(x + 5, y + 6, 22, 13, P.white, P.greyDark);
  b.rect(x + 10, y + 9, 3, 3, P.woodDark); // cup
  b.rect(x + 19, y + 11, 4, 3, P.coral); // pastry
};

export const kitchenCounter: TileDraw = (b, x, y) => {
  b.box(x, y + 6, 32, 24, P.white, P.greyDark);
  b.rect(x, y + 6, 32, 5, P.grey);
  b.rect(x + 5, y + 7, 10, 3, P.mistDark); // sink
  b.rect(x + 21, y + 15, 2, 8, P.greyDark);
  b.rect(x + 8, y + 15, 2, 8, P.greyDark);
};

export const bench: TileDraw = (b, x, y) => {
  b.box(x + 1, y + 10, 30, 6, P.woodLight, P.woodDark);
  b.box(x + 1, y + 17, 30, 6, P.woodLight, P.woodDark);
  b.rect(x + 4, y + 23, 3, 6, P.charcoal);
  b.rect(x + 25, y + 23, 3, 6, P.charcoal);
};

export const tree: TileDraw = (b, x, y) => {
  b.rect(x + 6, y + 28, 20, 3, P.grassDark); // shadow
  b.rect(x + 14, y + 20, 4, 9, P.woodDark);
  b.rect(x + 5, y + 6, 22, 15, P.leafDark);
  b.rect(x + 8, y + 2, 16, 5, P.leafDark);
  b.rect(x + 7, y + 5, 18, 13, P.leaf);
  b.rect(x + 10, y + 7, 6, 4, P.leafLight);
  b.rect(x + 19, y + 12, 4, 3, P.leafLight);
};

export const rock: TileDraw = (b, x, y) => {
  b.box(x + 8, y + 16, 16, 11, P.grey, P.greyDark);
  b.box(x + 18, y + 20, 8, 7, P.mistDark, P.greyDark);
};
