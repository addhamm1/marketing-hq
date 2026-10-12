// Generates the web app icons (Espaces yellow "E." on black) into public/icons/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const BLACK: [number, number, number] = [0x04, 0x07, 0x07];
const mark = PNG.sync.read(readFileSync("public/brand/espaces-e-yellow.png"));

/** Bilinear sample of the mark's RGBA at a fractional position. */
function sample(x: number, y: number): [number, number, number, number] {
  const x0 = Math.max(0, Math.min(mark.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(mark.height - 1, Math.floor(y)));
  const x1 = Math.min(mark.width - 1, x0 + 1);
  const y1 = Math.min(mark.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const px = (xx: number, yy: number, c: number) => mark.data[(yy * mark.width + xx) * 4 + c];
  const out: number[] = [];
  for (let c = 0; c < 4; c++) {
    const top = px(x0, y0, c) * (1 - fx) + px(x1, y0, c) * fx;
    const bottom = px(x0, y1, c) * (1 - fx) + px(x1, y1, c) * fx;
    out.push(top * (1 - fy) + bottom * fy);
  }
  return out as [number, number, number, number];
}

function icon(size: number, padding: number, rounded: boolean) {
  const png = new PNG({ width: size, height: size });
  const r = rounded ? size * 0.22 : 0;
  const markH = size - padding * 2;
  const markW = (markH * mark.width) / mark.height;
  const left = (size - markW) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = Math.max(r - x, 0, x - (size - 1 - r));
      const dy = Math.max(r - y, 0, y - (size - 1 - r));
      const inside = !rounded || dx * dx + dy * dy <= r * r;
      let [cr, cg, cb] = BLACK;
      const mx = ((x - left) / markW) * mark.width;
      const my = ((y - padding) / markH) * mark.height;
      if (mx >= 0 && mx < mark.width && my >= 0 && my < mark.height) {
        const [sr, sg, sb, sa] = sample(mx, my);
        const a = sa / 255;
        cr = cr * (1 - a) + sr * a;
        cg = cg * (1 - a) + sg * a;
        cb = cb * (1 - a) + sb * a;
      }
      png.data[i] = Math.round(cr);
      png.data[i + 1] = Math.round(cg);
      png.data[i + 2] = Math.round(cb);
      png.data[i + 3] = inside ? 255 : 0;
    }
  }
  return PNG.sync.write(png);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", icon(192, 40, true));
writeFileSync("public/icons/icon-512.png", icon(512, 104, true));
writeFileSync("public/icons/maskable-512.png", icon(512, 150, false));
writeFileSync("public/icons/apple-touch-icon.png", icon(180, 38, false));
console.log("icons written");
