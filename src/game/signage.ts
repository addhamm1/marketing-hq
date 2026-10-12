import { z } from "zod";

/**
 * Room and team signs: point objects in the Tiled map's `signs` layer. The
 * object name is the label key (translated by the page), the optional
 * `accent` property a `#rrggbb` colour or `team:<slug>`. Pure, no Phaser.
 */

export type SignDef = { key: string; x: number; y: number; accent: string | null };

/** Espaces signage: black plate, yellow lettering. */
export const SIGN_PLATE = "#040707";
export const SIGN_TEXT = "#F7D139";
export const SIGN_EDGE = "#2A2A29";
const DEFAULT_ACCENT = "#F7D139";
const HEX = /^#[0-9a-fA-F]{6}$/;

const layerSchema = z.object({
  layers: z.array(
    z.object({
      name: z.string(),
      objects: z
        .array(
          z.object({
            name: z.string(),
            x: z.number(),
            y: z.number(),
            properties: z.array(z.object({ name: z.string(), value: z.unknown() })).optional(),
          }),
        )
        .optional(),
    }),
  ),
});

export function readSigns(json: unknown): SignDef[] {
  const parsed = layerSchema.safeParse(json);
  if (!parsed.success) return [];
  const layer = parsed.data.layers.find((l) => l.name === "signs");
  return (layer?.objects ?? [])
    .filter((o) => o.name)
    .map((o) => {
      const accent = o.properties?.find((p) => p.name === "accent")?.value;
      return { key: o.name, x: Math.round(o.x), y: Math.round(o.y), accent: typeof accent === "string" ? accent : null };
    });
}

/** Colour of a sign's accent strip: a literal colour, a team's colour, or Espaces yellow. */
export function resolveAccent(accent: string | null, teamColors: Record<string, string>): string {
  if (!accent) return DEFAULT_ACCENT;
  if (accent.startsWith("team:")) {
    const color = teamColors[accent.slice(5)];
    return color && HEX.test(color) ? color : DEFAULT_ACCENT;
  }
  return HEX.test(accent) ? accent : DEFAULT_ACCENT;
}

/** Signs never get smaller on screen than this (CSS px of cap height, roughly). */
export const MIN_SCREEN_FONT = 9;
const MAX_SIGN_SCALE = 2;

/**
 * World scale for a sign so its text stays readable when zoomed out, without
 * growing when zoomed in. Snapped to quarter steps so text re-renders rarely.
 */
export function signScale(zoom: number, fontSize: number): number {
  if (!(zoom > 0)) return 1;
  const needed = MIN_SCREEN_FONT / (fontSize * zoom);
  return Math.min(MAX_SIGN_SCALE, Math.max(1, Math.ceil(needed * 4) / 4));
}

/** Canvas resolution for crisp text at this zoom and scale (whole numbers, capped). */
export function textResolution(zoom: number, scale = 1, pixelRatio = 1): number {
  return Math.min(8, Math.max(2, Math.ceil(zoom * scale * pixelRatio)));
}

/** Uppercase Latin labels read like signage; Arabic has no case and is left alone. */
export function signText(label: string): string {
  return label.toLocaleUpperCase("en");
}
