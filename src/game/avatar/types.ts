/** Types shared by the avatar compositor, the character editor and the map. No runtime code. */

export type Direction = "down" | "left" | "right" | "up";
export type TintKind = "skin" | "hair" | "clothing";
export type LayerKey = "body" | "bottom" | "top" | "shoes" | "hair" | "facial_hair" | "headwear" | "glasses" | "accessory";

/** The layers that have seasonal options. */
export type SeasonalLayer = "top" | "headwear" | "accessory";

export interface ManifestOption {
  id: string;
  /** Sheet path relative to `/sprites/`. */
  file: string;
  tintable: boolean;
  /** Optional untinted detail sheet drawn over the tinted base (e.g. a logo). */
  overlay?: string;
  /** Layers this option fully covers; they are skipped when composing (hijabs hide hair). */
  hides?: LayerKey[];
  /** Wearable only while an active row in `seasonal_events` lists this id. */
  seasonal?: boolean;
}

export interface ManifestLayer {
  key: LayerKey;
  required: boolean;
  tint: TintKind | null;
  options: ManifestOption[];
}

export interface ManifestAnimation {
  frames: number[];
  frameRate: number;
}

export interface AvatarDefaults {
  body: string;
  skin: string;
  hair?: string | null;
  hairColor?: string;
  top: string;
  topColor?: string;
  bottom: string;
  bottomColor?: string;
  shoes: string;
  shoesColor?: string;
}

export interface SpriteManifest {
  version: number;
  frameWidth: number;
  frameHeight: number;
  directions: Direction[];
  animations: { idle: ManifestAnimation; walk: ManifestAnimation };
  palettes: Record<TintKind, string[]>;
  /** Espaces brand colours, a subset of the clothing palette. */
  brandColors?: string[];
  layers: ManifestLayer[];
  defaults: AvatarDefaults;
}

/** What a person goes back to on a layer when the seasonal item they chose is out of season. */
export type RegularItems = Partial<Record<SeasonalLayer, string | null>>;

/** Stored on `avatars.config`: layer key -> option id, plus `<layer>Color` tints (skin uses `skin`). */
export type AvatarConfig = {
  body: string;
  skin: string;
  hair?: string | null;
  hairColor?: string;
  facial_hair?: string | null;
  top: string;
  topColor?: string;
  bottom: string;
  bottomColor?: string;
  shoes: string;
  shoesColor?: string;
  headwear?: string | null;
  headwearColor?: string;
  glasses?: string | null;
  accessory?: string | null;
  accessoryColor?: string;
  regular?: RegularItems;
};

/** A named outfit saved in one of the three slots on `avatars.looks`. */
export type SavedLook = { slot: number; name: string; config: AvatarConfig };
