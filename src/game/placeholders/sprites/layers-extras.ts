import { Mask, type PixelBuffer, hex } from "../pixels";
import { type LayerDraw, geometry } from "./anatomy";

/** glasses and accessory layers: never tinted, they keep their own colours. */

const FRAME = hex("#1f2937");
const LENS = hex("#d6ecff70");
const BAND = hex("#262b31");
const BAND_LIGHT = hex("#4b5560");
const CUSHION = hex("#d9765f");
const STRAP = hex("#0f4c5c");
const BADGE = hex("#f7f6f2");

function lens(buf: PixelBuffer, x: number, y: number, round: boolean): void {
  const m = new Mask();
  if (round) m.addRounded(x, y, 4, 4);
  else m.add(x, y, 4, 3);
  for (let yy = y; yy < y + 4; yy++) {
    for (let xx = x; xx < x + 4; xx++) {
      if (!m.has(xx, yy)) continue;
      const edge = !m.has(xx - 1, yy) || !m.has(xx + 1, yy) || !m.has(xx, yy - 1) || !m.has(xx, yy + 1);
      buf.set(xx, yy, edge ? FRAME : LENS);
    }
  }
}

function glasses(round: boolean): LayerDraw {
  return ({ buf, view, pose }) => {
    const { ht } = geometry(view, pose, "fit");
    const y = ht + 5;
    if (view === "down") {
      lens(buf, 12, y, round);
      lens(buf, 17, y, round);
      buf.set(16, y + 1, FRAME);
      buf.set(11, y + 1, FRAME);
      buf.set(21, y + 1, FRAME);
    } else if (view === "left") {
      lens(buf, 9, y, round);
      buf.rect(13, y + 1, 4, 1, FRAME); // temple arm to the ear
    } else {
      buf.set(9, y + 1, FRAME);
      buf.set(22, y + 1, FRAME);
    }
  };
}

export const glassesRound = glasses(true);
export const glassesSquare = glasses(false);

export const headphones: LayerDraw = ({ buf, view, pose }) => {
  const { ht } = geometry(view, pose, "fit");
  const band = new Mask().addRounded(10, ht - 2, 12, 3).cut(11, ht - 1, 10, 2);
  for (let y = ht - 2; y < ht + 1; y++) for (let x = 10; x < 22; x++) if (band.has(x, y)) buf.set(x, y, BAND);
  buf.rect(12, ht - 2, 8, 1, BAND_LIGHT);
  const cup = (x: number) => {
    buf.rect(x, ht + 4, 3, 5, BAND);
    buf.rect(x + 1, ht + 5, 1, 3, CUSHION);
  };
  if (view === "left") {
    buf.rect(16, ht - 1, 2, 5, BAND);
    buf.rect(15, ht + 4, 4, 5, BAND);
    buf.rect(16, ht + 5, 2, 3, CUSHION);
  } else {
    buf.rect(9, ht - 1, 1, 5, BAND);
    buf.rect(22, ht - 1, 1, 5, BAND);
    cup(7);
    cup(22);
  }
};

export const lanyard: LayerDraw = ({ buf, view, pose }) => {
  const { ht } = geometry(view, pose, "fit");
  const top = ht + 12;
  if (view === "down") {
    for (let i = 0; i < 4; i++) {
      buf.set(13 + Math.floor(i / 1.5), top + i, STRAP);
      buf.set(19 - Math.floor(i / 1.5), top + i, STRAP);
    }
    buf.rect(15, top + 4, 3, 4, BADGE);
    buf.rect(15, top + 4, 3, 1, STRAP);
  } else if (view === "left") {
    buf.rect(13, top, 1, 4, STRAP);
    buf.rect(12, top + 4, 2, 4, BADGE);
  } else {
    buf.rect(12, top, 8, 1, STRAP);
  }
};
