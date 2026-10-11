// Generates the web app icons (pixel-tile logo) into public/icons/.
import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const INK: [number, number, number] = [0x1f, 0x4f, 0x5a];
const LIGHT: [number, number, number] = [0xf3, 0xf7, 0xf8];
const SOFT: [number, number, number] = [0x9f, 0xc9, 0xc8];

function icon(size: number, padding: number, rounded: boolean) {
  const png = new PNG({ width: size, height: size });
  const r = rounded ? size * 0.22 : 0;
  const cell = (size - padding * 2) / 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded square mask
      const dx = Math.max(r - x, 0, x - (size - 1 - r));
      const dy = Math.max(r - y, 0, y - (size - 1 - r));
      const inside = !rounded || dx * dx + dy * dy <= r * r;
      let c = INK;
      const gx = Math.floor((x - padding) / cell);
      const gy = Math.floor((y - padding) / cell);
      if (gx >= 2 && gx < 4 && gy >= 2 && gy < 4) c = LIGHT;
      if (gx >= 4 && gx < 6 && gy >= 4 && gy < 6) c = SOFT;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = inside ? 255 : 0;
    }
  }
  return PNG.sync.write(png);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", icon(192, 24, true));
writeFileSync("public/icons/icon-512.png", icon(512, 64, true));
writeFileSync("public/icons/maskable-512.png", icon(512, 128, false));
writeFileSync("public/icons/apple-touch-icon.png", icon(180, 22, false));
console.log("icons written");
