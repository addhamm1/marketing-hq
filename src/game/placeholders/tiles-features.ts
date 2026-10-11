import { P } from "./palette";
import { shade } from "./pixels";
import type { TileDraw } from "./tiles-structure";

/** The clickable "feature" props of the HQ: kanban wall, mailbox, cafe, studio, and friends. */

export const kanban: TileDraw = (b, x, y) => {
  b.box(x + 1, y + 3, 30, 22, P.white, P.charcoal);
  const notes = [P.gold, P.coral, P.tealLight];
  for (let col = 0; col < 3; col++) {
    const cx = x + 3 + col * 9;
    b.rect(cx, y + 6, 8, 1, P.greyDark);
    for (let i = 0; i < 2 + (col % 2); i++) b.rect(cx + 1, y + 9 + i * 5, 6, 4, notes[(col + i) % 3]);
  }
};

export const mailbox: TileDraw = (b, x, y) => {
  b.rect(x + 14, y + 18, 4, 12, P.charcoal);
  b.box(x + 6, y + 4, 20, 15, P.teal, P.ink);
  b.rect(x + 9, y + 9, 14, 2, P.ink); // slot
  b.rect(x + 25, y + 5, 2, 8, P.coral); // flag
  b.rect(x + 27, y + 5, 3, 3, P.coral);
};

export const noticeBoard: TileDraw = (b, x, y) => {
  b.box(x + 2, y + 4, 28, 20, P.woodLight, P.woodDark);
  b.rect(x + 5, y + 7, 8, 7, P.white);
  b.rect(x + 15, y + 8, 10, 6, P.gold);
  b.rect(x + 8, y + 16, 9, 5, P.sky);
  b.rect(x + 20, y + 16, 6, 5, P.white);
  for (const [px, py] of [[8, 7], [19, 8], [12, 16], [23, 16]] as const) b.set(x + px, y + py, P.coral);
};

export const cafeCounter: TileDraw = (b, x, y) => {
  b.rect(x, y + 6, 32, 24, P.woodDark);
  b.rect(x, y + 4, 32, 4, P.cream);
  b.rect(x, y + 8, 32, 1, shade(P.woodDark, 0.7));
  for (let i = 2; i < 32; i += 6) b.rect(x + i, y + 12, 3, 16, shade(P.woodDark, 1.15));
  b.rect(x, y + 29, 32, 1, P.ink);
};

export const coffeeMachine: TileDraw = (b, x, y) => {
  cafeCounter(b, x, y);
  b.box(x + 8, y - 0, 16, 14, P.charcoal, P.ink);
  b.rect(x + 11, y + 3, 10, 3, P.greyDark);
  b.set(x + 12, y + 4, P.coral);
  b.rect(x + 13, y + 8, 6, 2, P.ink);
  b.rect(x + 14, y + 10, 4, 3, P.white); // cup
};

export const trophyShelf: TileDraw = (b, x, y) => {
  b.box(x + 1, y + 2, 30, 28, P.woodDark, P.ink);
  b.rect(x + 3, y + 15, 26, 2, P.wood);
  b.rect(x + 3, y + 27, 26, 1, P.wood);
  // cup
  b.rect(x + 6, y + 6, 6, 5, P.gold);
  b.rect(x + 8, y + 11, 2, 2, P.gold);
  b.rect(x + 7, y + 13, 4, 2, shade(P.gold, 0.8));
  // star plaque and medal
  b.rect(x + 17, y + 7, 9, 8, P.cream);
  b.set(x + 21, y + 9, P.gold);
  b.rect(x + 20, y + 10, 3, 2, P.gold);
  b.rect(x + 7, y + 20, 5, 5, P.gold);
  b.rect(x + 8, y + 18, 3, 2, P.coral);
  b.rect(x + 17, y + 19, 9, 7, P.tealLight);
};

export const receptionDesk: TileDraw = (b, x, y) => {
  b.rect(x, y + 8, 32, 22, P.teal);
  b.rect(x, y + 6, 32, 4, P.oak);
  b.rect(x, y + 10, 32, 1, P.ink);
  b.rect(x, y + 29, 32, 1, P.ink);
  b.rect(x + 12, y + 16, 8, 6, P.tealLight); // logo panel
  b.rect(x + 14, y + 18, 4, 2, P.white);
};

export const studioLight: TileDraw = (b, x, y) => {
  b.rect(x + 15, y + 12, 2, 16, P.charcoal);
  b.rect(x + 9, y + 28, 14, 2, P.charcoal);
  b.box(x + 7, y + 2, 18, 11, P.ink, P.ink);
  b.rect(x + 9, y + 4, 14, 7, P.cream);
  b.rect(x + 10, y + 5, 6, 2, P.white);
};

export const studioBackdrop: TileDraw = (b, x, y) => {
  b.rect(x, y, 32, 32, P.cream);
  b.rect(x, y, 32, 2, P.charcoal);
  b.rect(x, y + 24, 32, 8, shade(P.cream, 0.94));
  b.rect(x, y + 24, 32, 1, shade(P.cream, 0.88));
};
