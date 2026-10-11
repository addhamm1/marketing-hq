import type { LayerDraw } from "./anatomy";
import * as B from "./layers-body";
import * as X from "./layers-extras";
import * as H from "./layers-hair";
import * as W from "./layers-headwear";

/** Placeholder character catalogue: layers in draw order with their options. */

type Tint = "skin" | "hair" | "clothing" | null;

export type CatalogOption = {
  id: string;
  draw: LayerDraw;
  /** Untinted detail drawn on top of the tinted base (e.g. a logo). */
  overlay?: LayerDraw;
  /** Other layers this option covers completely (they are skipped when composing). */
  hides?: string[];
};

export type CatalogLayer = { key: string; required: boolean; tint: Tint; options: CatalogOption[] };

const hijab = (id: string, draw: LayerDraw): CatalogOption => ({ id, draw, hides: ["hair"] });

export const CATALOG: CatalogLayer[] = [
  { key: "body", required: true, tint: "skin", options: [{ id: "b1", draw: B.bodyB1 }, { id: "b2", draw: B.bodyB2 }] },
  {
    key: "bottom",
    required: true,
    tint: "clothing",
    options: [{ id: "pants", draw: B.pants }, { id: "skirt", draw: B.skirt }, { id: "shorts", draw: B.shorts }],
  },
  {
    key: "top",
    required: true,
    tint: "clothing",
    options: [
      { id: "tshirt", draw: B.tshirt },
      { id: "hoodie-espaces", draw: B.hoodie, overlay: B.hoodieLogo },
      { id: "shirt", draw: B.shirt },
      { id: "blazer", draw: B.blazer },
    ],
  },
  { key: "shoes", required: true, tint: "clothing", options: [{ id: "sneakers", draw: B.sneakers }, { id: "boots", draw: B.boots }] },
  {
    key: "hair",
    required: false,
    tint: "hair",
    options: [
      { id: "short", draw: H.hairShort },
      { id: "long", draw: H.hairLong },
      { id: "curly", draw: H.hairCurly },
      { id: "bun", draw: H.hairBun },
      { id: "buzz", draw: H.hairBuzz },
    ],
  },
  { key: "facial_hair", required: false, tint: "hair", options: [{ id: "beard", draw: H.beard }, { id: "mustache", draw: H.mustache }] },
  {
    key: "headwear",
    required: false,
    tint: "clothing",
    options: [
      { id: "cap", draw: W.cap },
      { id: "beanie", draw: W.beanie },
      hijab("hijab-classic", W.hijabClassic),
      hijab("hijab-wrap", W.hijabWrap),
      hijab("hijab-sport", W.hijabSport),
    ],
  },
  { key: "glasses", required: false, tint: null, options: [{ id: "round", draw: X.glassesRound }, { id: "square", draw: X.glassesSquare }] },
  { key: "accessory", required: false, tint: null, options: [{ id: "headphones", draw: X.headphones }, { id: "lanyard", draw: X.lanyard }] },
];

export const PALETTES = {
  skin: ["#f6d7c3", "#eac0a0", "#d9a27a", "#c68642", "#8d5524", "#5b3a24"],
  hair: ["#1a1410", "#2b1b10", "#5a3825", "#8a5a33", "#c18f5a", "#e3c27a", "#9a9a9a", "#7a2e2e"],
  clothing: [
    "#0F4C5C", "#111827", "#374151", "#9ca3af", "#f3f4f6", "#1e3a8a",
    "#7c2d12", "#b45309", "#166534", "#6b21a8", "#be185d", "#d6b98c",
  ],
};

export const DEFAULTS = {
  body: "b1",
  skin: "#c68642",
  hair: "short",
  hairColor: "#2b1b10",
  top: "hoodie-espaces",
  topColor: "#0F4C5C",
  bottom: "pants",
  bottomColor: "#374151",
  shoes: "sneakers",
  shoesColor: "#111827",
};

export function overlayFile(layer: string, id: string): string {
  return `${layer}/${id}.detail.png`;
}

/** The manifest JSON written to `public/sprites/manifest.json`. */
export function buildManifest() {
  return {
    version: 1,
    frameWidth: 32,
    frameHeight: 32,
    directions: ["down", "left", "right", "up"],
    animations: { idle: { frames: [0, 1], frameRate: 2 }, walk: { frames: [2, 3, 4, 5], frameRate: 8 } },
    palettes: PALETTES,
    layers: CATALOG.map((layer) => ({
      key: layer.key,
      required: layer.required,
      tint: layer.tint,
      options: layer.options.map((o) => ({
        id: o.id,
        file: `${layer.key}/${o.id}.png`,
        tintable: layer.tint !== null,
        ...(o.overlay ? { overlay: overlayFile(layer.key, o.id) } : {}),
        ...(o.hides ? { hides: o.hides } : {}),
      })),
    })),
    defaults: DEFAULTS,
  };
}
