/**
 * Colour ramps for the character art. Tintable sprites are painted in six grey
 * levels; the compositor maps each level to a tone of the chosen colour. Shadows
 * lean cool and highlights lean warm, which keeps every colour reading as shaded
 * pixel art, including near-black fabric, where a plain multiply would go flat.
 * Pure code: used by the browser compositor and the Node art generator.
 */

export type RampKind = "skin" | "hair" | "clothing";
export type Rgb = readonly [r: number, g: number, b: number];

/** The grey value each tone is painted with in a tintable sprite. */
export const TONE_LEVELS = { line: 56, deep: 104, shade: 150, base: 200, light: 230, hi: 255 } as const;

export type ToneName = keyof typeof TONE_LEVELS;
export type Ramp = Record<ToneName, Rgb>;

const TONE_ORDER: ToneName[] = ["line", "deep", "shade", "base", "light", "hi"];

function parseHex(color: string): Rgb {
  const v = color.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function toHsl([r, g, b]: Rgb): [h: number, s: number, l: number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rr ? ((gg - bb) / d + 6) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return [h * 60, s, l];
}

function toRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor(((h % 360) + 360) % 360 / 60);
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][sector];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Move hue `h` toward `target` along the short way round, by at most `amount` degrees. */
function leanHue(h: number, target: number, amount: number): number {
  const delta = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(delta) * Math.min(Math.abs(delta), amount) + 360) % 360;
}

const HUE_TARGETS: Record<RampKind, { cool: number; warm: number }> = {
  skin: { cool: 350, warm: 40 },
  hair: { cool: 265, warm: 40 },
  clothing: { cool: 235, warm: 55 },
};

/** The six tones of a colour. `base` is the chosen colour itself, except very dark ones, which are lifted so folds stay visible. */
export function toneRamp(color: string, kind: RampKind = "clothing"): Ramp {
  const rgb = parseHex(color);
  const [h, s, rawL] = toHsl(rgb);
  const l = rawL < 0.2 ? 0.1 + rawL * 0.5 : rawL;
  const { cool, warm } = HUE_TARGETS[kind];
  // Skin keeps soft brown outlines: saturated dark tones would read as red lines around the face.
  const skin = kind === "skin";
  const tone = (lean: number, target: number, sat: number, light: number): Rgb =>
    toRgb(leanHue(h, target, lean), Math.min(0.95, s * sat), Math.max(0, Math.min(1, light)));
  return {
    line: tone(skin ? 6 : 20, cool, skin ? 0.5 : 1, Math.max(0.035, l * (skin ? 0.4 : 0.34))),
    deep: tone(skin ? 6 : 15, cool, skin ? 0.62 : 1.08, l * (skin ? 0.68 : 0.62)),
    shade: tone(skin ? 5 : 9, cool, skin ? 0.85 : 1.05, l * (skin ? 0.86 : 0.8)),
    base: rawL < 0.2 ? toRgb(h, s, l) : rgb,
    light: tone(7, warm, 0.96, l + (1 - l) * 0.16 + 0.04),
    hi: tone(12, warm, 0.82, l + (1 - l) * 0.34 + 0.06),
  };
}

/** A 256-entry RGB lookup table from a sprite's grey value to the tinted colour. */
export function tintLut(color: string, kind: RampKind = "clothing"): Uint8ClampedArray {
  const ramp = toneRamp(color, kind);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let grey = 0; grey < 256; grey++) {
    const upper = TONE_ORDER.findIndex((name) => TONE_LEVELS[name] >= grey);
    const hiStop = TONE_ORDER[upper === -1 ? TONE_ORDER.length - 1 : upper];
    const loStop = TONE_ORDER[Math.max(0, upper - 1)];
    const span = TONE_LEVELS[hiStop] - TONE_LEVELS[loStop];
    const f = span > 0 ? Math.max(0, (grey - TONE_LEVELS[loStop]) / span) : 0;
    for (let c = 0; c < 3; c++) lut[grey * 3 + c] = ramp[loStop][c] + (ramp[hiStop][c] - ramp[loStop][c]) * f;
  }
  return lut;
}
