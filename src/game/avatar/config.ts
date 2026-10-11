import { z } from "zod";

import type { AvatarConfig, LayerKey, ManifestLayer, ManifestOption, SpriteManifest, TintKind } from "./types";

/**
 * Pure avatar config helpers (no DOM): validation, defaults, randomising and a
 * stable hash. Safe to import from server code and Node tests.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #rrggbb colour");
const optionId = z.string().regex(/^[a-z0-9-]+$/, "Expected a lowercase option id");
const optionalId = optionId.nullable().optional();

export const avatarConfigSchema = z.object({
  body: optionId,
  skin: hexColor,
  hair: optionalId,
  hairColor: hexColor.optional(),
  facial_hair: optionalId,
  top: optionId,
  topColor: hexColor.optional(),
  bottom: optionId,
  bottomColor: hexColor.optional(),
  shoes: optionId,
  shoesColor: hexColor.optional(),
  headwear: optionalId,
  headwearColor: hexColor.optional(),
  glasses: optionalId,
  accessory: optionalId,
});

const layerKey = z.enum(["body", "bottom", "top", "shoes", "hair", "facial_hair", "headwear", "glasses", "accessory"]);
const tintKind = z.enum(["skin", "hair", "clothing"]);
const animation = z.object({ frames: z.array(z.number().int().min(0)), frameRate: z.number().positive() });

/** Validates `/sprites/manifest.json` when it is loaded. */
export const manifestSchema: z.ZodType<SpriteManifest> = z.object({
  version: z.number().int(),
  frameWidth: z.number().int().positive(),
  frameHeight: z.number().int().positive(),
  directions: z.array(z.enum(["down", "left", "right", "up"])),
  animations: z.object({ idle: animation, walk: animation }),
  palettes: z.object({ skin: z.array(hexColor), hair: z.array(hexColor), clothing: z.array(hexColor) }),
  layers: z.array(
    z.object({
      key: layerKey,
      required: z.boolean(),
      tint: tintKind.nullable(),
      options: z.array(
        z.object({
          id: optionId,
          file: z.string().min(1),
          tintable: z.boolean(),
          overlay: z.string().min(1).optional(),
          hides: z.array(layerKey).optional(),
        }),
      ),
    }),
  ),
  defaults: z.object({
    body: optionId,
    skin: hexColor,
    hair: optionalId,
    hairColor: hexColor.optional(),
    top: optionId,
    topColor: hexColor.optional(),
    bottom: optionId,
    bottomColor: hexColor.optional(),
    shoes: optionId,
    shoesColor: hexColor.optional(),
  }),
});

type ColorKey = "skin" | "hairColor" | "topColor" | "bottomColor" | "shoesColor" | "headwearColor";

/** Which config field holds the tint colour for each layer. */
const COLOR_KEY: Partial<Record<LayerKey, ColorKey>> = {
  body: "skin",
  hair: "hairColor",
  facial_hair: "hairColor",
  top: "topColor",
  bottom: "bottomColor",
  shoes: "shoesColor",
  headwear: "headwearColor",
};

const COLOR_TINT: Record<ColorKey, TintKind> = {
  skin: "skin",
  hairColor: "hair",
  topColor: "clothing",
  bottomColor: "clothing",
  shoesColor: "clothing",
  headwearColor: "clothing",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findOption(manifest: SpriteManifest, key: LayerKey, id: unknown): ManifestOption | undefined {
  if (typeof id !== "string") return undefined;
  return manifest.layers.find((l) => l.key === key)?.options.find((o) => o.id === id);
}

/**
 * Clean any stored value into a config the manifest can render. Unknown or
 * missing options fall back to the manifest defaults (or the first option for
 * required layers); an explicit `null` on an optional layer means "none".
 */
export function validateAgainstManifest(input: unknown, manifest: SpriteManifest): AvatarConfig {
  const raw = isRecord(input) ? input : {};
  const defaults: Record<string, unknown> = { ...manifest.defaults };

  const option = (key: LayerKey): string | null => {
    if (findOption(manifest, key, raw[key])) return raw[key] as string;
    if (raw[key] === null) return null;
    return findOption(manifest, key, defaults[key]) ? (defaults[key] as string) : null;
  };
  const required = (key: LayerKey): string =>
    option(key) ?? manifest.layers.find((l) => l.key === key)?.options[0]?.id ?? String(defaults[key] ?? "");
  const color = (key: ColorKey): string => {
    const valid = (v: unknown): v is string => hexColor.safeParse(v).success;
    if (valid(raw[key])) return raw[key];
    if (valid(defaults[key])) return defaults[key];
    return manifest.palettes[COLOR_TINT[key]][0] ?? "#888888";
  };

  return {
    body: required("body"),
    skin: color("skin"),
    hair: option("hair"),
    hairColor: color("hairColor"),
    facial_hair: option("facial_hair"),
    top: required("top"),
    topColor: color("topColor"),
    bottom: required("bottom"),
    bottomColor: color("bottomColor"),
    shoes: required("shoes"),
    shoesColor: color("shoesColor"),
    headwear: option("headwear"),
    headwearColor: color("headwearColor"),
    glasses: option("glasses"),
    accessory: option("accessory"),
  };
}

export function defaultConfig(manifest: SpriteManifest): AvatarConfig {
  return validateAgainstManifest(manifest.defaults, manifest);
}

/** Chance that an optional layer is worn in a random character. */
const OPTIONAL_CHANCE: Partial<Record<LayerKey, number>> = {
  hair: 0.9,
  facial_hair: 0.25,
  headwear: 0.3,
  glasses: 0.3,
  accessory: 0.35,
};

export function randomConfig(manifest: SpriteManifest, rand: () => number = Math.random): AvatarConfig {
  const pick = <T>(items: readonly T[]): T | undefined => items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
  const raw: Record<string, string | null | undefined> = {};
  for (const layer of manifest.layers) {
    const worn = layer.required || rand() < (OPTIONAL_CHANCE[layer.key] ?? 0.3);
    raw[layer.key] = worn ? (pick(layer.options)?.id ?? null) : null;
  }
  for (const key of Object.keys(COLOR_TINT) as ColorKey[]) raw[key] = pick(manifest.palettes[COLOR_TINT[key]]);
  return validateAgainstManifest(raw, manifest);
}

/** Tint colour for a layer, or null when the layer is not tinted. */
export function layerTint(config: AvatarConfig, layer: ManifestLayer): string | null {
  if (!layer.tint) return null;
  const key = COLOR_KEY[layer.key];
  return (key && config[key]) || null;
}

/** Layers covered by another selected option (e.g. hair under a hijab). */
export function hiddenLayers(config: AvatarConfig, manifest: SpriteManifest): Set<LayerKey> {
  const hidden = new Set<LayerKey>();
  for (const layer of manifest.layers) {
    for (const key of findOption(manifest, layer.key, config[layer.key])?.hides ?? []) hidden.add(key);
  }
  return hidden;
}

/** The option selected for a layer, if it exists in the manifest. */
export function selectedOption(config: AvatarConfig, manifest: SpriteManifest, key: LayerKey): ManifestOption | undefined {
  return findOption(manifest, key, config[key]);
}

/** Stable hash of the key-sorted config (undefined fields ignored). */
export function configHash(config: AvatarConfig): string {
  const entries = Object.entries(config)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const json = JSON.stringify(Object.fromEntries(entries));
  // cyrb53: fast, well-distributed 53-bit string hash
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < json.length; i++) {
    const ch = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
