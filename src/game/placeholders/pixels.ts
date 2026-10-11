/**
 * Tiny RGBA pixel toolkit used by the placeholder art generator
 * (`scripts/make-placeholders.ts`). Pure TypeScript: no DOM, no Node APIs,
 * so it never ends up pulling anything heavy into the app bundle.
 */

export type RGBA = readonly [number, number, number, number];

export const CLEAR: RGBA = [0, 0, 0, 0];

/** Parse `#rrggbb` (or `#rrggbbaa`) into RGBA. */
export function hex(value: string): RGBA {
  const v = value.replace("#", "");
  const n = (i: number) => parseInt(v.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), v.length >= 8 ? n(6) : 255];
}

/** Lighten (f > 1) or darken (f < 1) a colour, keeping alpha. */
export function shade(c: RGBA, f: number): RGBA {
  const ch = (x: number) => Math.max(0, Math.min(255, Math.round(x * f)));
  return [ch(c[0]), ch(c[1]), ch(c[2]), c[3]];
}

export class PixelBuffer {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  set(x: number, y: number, c: RGBA): void {
    if (!this.inside(x, y)) return;
    const i = (y * this.width + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }

  get(x: number, y: number): RGBA {
    if (!this.inside(x, y)) return CLEAR;
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x: number, y: number): number {
    return this.inside(x, y) ? this.data[(y * this.width + x) * 4 + 3] : 0;
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  /** 1px outline of a rectangle. */
  frame(x: number, y: number, w: number, h: number, c: RGBA): void {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }

  /** Filled box with outline, top highlight and bottom shadow: the basic pixel-art "object". */
  box(x: number, y: number, w: number, h: number, base: RGBA, outline?: RGBA): void {
    this.rect(x, y, w, h, base);
    this.rect(x + 1, y + 1, w - 2, 1, shade(base, 1.15));
    this.rect(x + 1, y + h - 2, w - 2, 1, shade(base, 0.82));
    this.frame(x, y, w, h, outline ?? shade(base, 0.55));
  }

  /** Copy a region from another buffer; `mirror` flips horizontally. Transparent pixels are skipped. */
  blit(src: PixelBuffer, sx: number, sy: number, w: number, h: number, dx: number, dy: number, mirror = false): void {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = src.get(sx + x, sy + y);
        if (c[3] === 0) continue;
        this.set(dx + (mirror ? w - 1 - x : x), dy + y, c);
      }
    }
  }
}

/** Palette used to paint a mask: fill, inner shading and outline. */
export type Paint = { base: RGBA; shadow: RGBA; outline: RGBA; light?: RGBA };

/**
 * Boolean shape on a small grid. Characters are built by adding and cutting
 * rectangles, then painted with an automatic outline and shading so every
 * layer reads as pixel art without hand-placing each pixel.
 */
export class Mask {
  private readonly bits: Uint8Array;

  constructor(
    readonly width = 32,
    readonly height = 32,
  ) {
    this.bits = new Uint8Array(width * height);
  }

  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height && this.bits[y * this.width + x] === 1;
  }

  private put(x: number, y: number, v: 0 | 1): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.bits[y * this.width + x] = v;
  }

  add(x: number, y: number, w: number, h: number): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.put(xx, yy, 1);
    return this;
  }

  cut(x: number, y: number, w: number, h: number): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.put(xx, yy, 0);
    return this;
  }

  /** Rectangle with its four corners clipped: a cheap "rounded" pixel shape. */
  addRounded(x: number, y: number, w: number, h: number): this {
    this.add(x, y, w, h);
    this.cut(x, y, 1, 1).cut(x + w - 1, y, 1, 1).cut(x, y + h - 1, 1, 1).cut(x + w - 1, y + h - 1, 1, 1);
    return this;
  }

  /** Paint the mask into `buf` at offset (ox, oy). */
  paint(buf: PixelBuffer, ox: number, oy: number, p: Paint): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.has(x, y)) continue;
        const edge = !this.has(x - 1, y) || !this.has(x + 1, y) || !this.has(x, y - 1) || !this.has(x, y + 1);
        let c = p.base;
        if (edge) c = p.outline;
        else if (!this.has(x + 1, y + 1) || !this.has(x, y + 2)) c = p.shadow;
        else if (p.light && !this.has(x, y - 2)) c = p.light;
        buf.set(ox + x, oy + y, c);
      }
    }
  }
}
