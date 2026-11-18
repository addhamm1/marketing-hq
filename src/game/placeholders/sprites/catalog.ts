import type { LayerDraw } from "./anatomy";
import * as B from "./layers-body";
import * as D from "./layers-bottoms";
import * as X from "./layers-extras";
import * as F from "./layers-facial";
import * as H from "./layers-hair";
import * as L from "./layers-hair-long";
import * as W from "./layers-headwear";
import * as J from "./layers-hijab";
import * as R from "./layers-long";
import * as S from "./layers-seasonal";
import * as O from "./layers-shoes";
import * as T from "./layers-tops";

/** Character catalogue: layers in draw order with their options. */

type Tint = "skin" | "hair" | "clothing" | null;

export type CatalogOption = {
  id: string;
  draw: LayerDraw;
  /** Untinted detail drawn on top of the tinted base (e.g. a logo). */
  overlay?: LayerDraw;
  /** Other layers this option covers completely (they are skipped when composing). */
  hides?: string[];
  /** Keeps its own colours even on a layer that is otherwise tinted. */
  fixed?: boolean;
  /** Only selectable while an active row in `seasonal_events` lists this id. */
  seasonal?: boolean;
};

export type CatalogLayer = { key: string; required: boolean; tint: Tint; options: CatalogOption[] };

const hijab = (id: string, draw: LayerDraw): CatalogOption => ({ id, draw, hides: ["hair"] });
const fullLength = (id: string, draw: LayerDraw): CatalogOption => ({ id, draw, hides: ["bottom"] });
const seasonal = (id: string, draw: LayerDraw, hides?: string[]): CatalogOption => ({
  id,
  draw,
  fixed: true,
  seasonal: true,
  ...(hides ? { hides } : {}),
});

export const CATALOG: CatalogLayer[] = [
  {
    key: "body",
    required: true,
    tint: "skin",
    options: [
      { id: "b1", draw: B.bodyB1, overlay: B.faceDetail },
      { id: "b2", draw: B.bodyB2, overlay: B.faceDetail },
    ],
  },
  {
    key: "bottom",
    required: true,
    tint: "clothing",
    options: [
      { id: "pants", draw: D.pants },
      { id: "skirt", draw: D.skirt },
      { id: "shorts", draw: D.shorts },
      { id: "jeans", draw: D.jeans },
      { id: "chinos", draw: D.chinos },
      { id: "wide-leg", draw: D.wideLeg },
      { id: "long-skirt", draw: D.longSkirt },
    ],
  },
  {
    key: "top",
    required: true,
    tint: "clothing",
    options: [
      { id: "tshirt", draw: T.tshirt },
      { id: "hoodie-espaces", draw: T.hoodie, overlay: T.hoodieLogo },
      { id: "shirt", draw: T.shirt },
      { id: "blazer", draw: T.blazer, overlay: T.blazerInner },
      { id: "polo", draw: T.polo },
      { id: "sweater", draw: T.sweater },
      { id: "denim-jacket", draw: T.denimJacket, overlay: T.denimInner },
      { id: "vest", draw: T.vest, overlay: T.vestInner },
      fullLength("long-dress", R.longDress),
      fullLength("abaya", R.abaya),
      seasonal("winter-sweater", S.winterSweater),
      seasonal("ramadan-galabeya", S.ramadanGalabeya, ["bottom"]),
      seasonal("eid-kaftan", S.eidKaftan, ["bottom"]),
      seasonal("spring-shirt", S.springShirt),
    ],
  },
  {
    key: "shoes",
    required: true,
    tint: "clothing",
    options: [
      { id: "sneakers", draw: O.sneakers },
      { id: "boots", draw: O.boots },
      { id: "loafers", draw: O.loafers },
      { id: "flats", draw: O.flats },
      { id: "sandals", draw: O.sandals },
    ],
  },
  {
    key: "hair",
    required: false,
    tint: "hair",
    options: [
      { id: "short", draw: H.hairShort },
      { id: "long", draw: L.hairLong },
      { id: "curly", draw: H.hairCurly },
      { id: "bun", draw: H.hairBun },
      { id: "buzz", draw: H.hairBuzz },
      { id: "wavy-long", draw: L.hairWavyLong },
      { id: "ponytail", draw: L.hairPonytail },
      { id: "fade", draw: H.hairFade },
      { id: "side-part", draw: H.hairSidePart },
      { id: "afro", draw: H.hairAfro },
      { id: "braids", draw: L.hairBraids },
    ],
  },
  {
    key: "facial_hair",
    required: false,
    tint: "hair",
    options: [
      { id: "beard", draw: F.beard },
      { id: "mustache", draw: F.mustache },
      { id: "stubble", draw: F.stubble },
      { id: "goatee", draw: F.goatee },
      { id: "full-beard", draw: F.fullBeard },
    ],
  },
  {
    key: "headwear",
    required: false,
    tint: "clothing",
    options: [
      { id: "cap", draw: W.cap },
      { id: "beanie", draw: W.beanie },
      hijab("hijab-classic", J.hijabClassic),
      hijab("hijab-wrap", J.hijabWrap),
      hijab("hijab-sport", J.hijabSport),
      hijab("hijab-draped", J.hijabDraped),
      hijab("hijab-layered", J.hijabLayered),
      hijab("hijab-shawl", J.hijabShawl),
      { id: "turban-wrap", draw: W.turbanWrap, hides: ["hair"] },
      seasonal("party-hat", S.partyHat),
      seasonal("ramadan-taqiyah", S.ramadanTaqiyah),
      seasonal("eid-tarboush", S.eidTarboush),
      seasonal("spring-hat", S.springHat),
      seasonal("egypt-cap", S.egyptCap),
    ],
  },
  {
    key: "glasses",
    required: false,
    tint: null,
    options: [
      { id: "round", draw: X.glassesRound },
      { id: "square", draw: X.glassesSquare },
      { id: "sunglasses", draw: X.sunglasses },
    ],
  },
  {
    key: "accessory",
    required: false,
    tint: "clothing",
    options: [
      { id: "headphones", draw: X.headphones, fixed: true },
      { id: "lanyard", draw: X.lanyard, fixed: true },
      { id: "backpack", draw: X.backpack },
      { id: "camera-strap", draw: X.cameraStrap, fixed: true },
      { id: "scarf", draw: X.scarf },
      seasonal("winter-scarf", S.winterScarf),
      seasonal("ramadan-lantern", S.ramadanLantern),
      seasonal("eid-balloon", S.eidBalloon),
      seasonal("egypt-scarf", S.egyptScarf),
    ],
  },
];

/** Espaces brand colours, offered first in the clothing swatches. */
export const BRAND_COLORS = ["#F7D139", "#040707", "#2A2A29", "#EBE6DD", "#2D6372", "#FAA41A", "#D62C27"];

export const PALETTES = {
  skin: ["#f6d7c3", "#eac0a0", "#d9a27a", "#c68642", "#8d5524", "#5b3a24"],
  hair: ["#1a1410", "#2b1b10", "#5a3825", "#8a5a33", "#c18f5a", "#e3c27a", "#9a9a9a", "#7a2e2e"],
  clothing: [
    "#0F4C5C", "#111827", "#374151", "#9ca3af", "#f3f4f6", "#1e3a8a",
    "#7c2d12", "#b45309", "#166534", "#6b21a8", "#be185d", "#d6b98c",
    ...BRAND_COLORS,
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
    version: 2,
    frameWidth: 32,
    frameHeight: 32,
    directions: ["down", "left", "right", "up"],
    animations: { idle: { frames: [0, 1], frameRate: 2 }, walk: { frames: [2, 3, 4, 5], frameRate: 8 } },
    palettes: PALETTES,
    brandColors: BRAND_COLORS,
    layers: CATALOG.map((layer) => ({
      key: layer.key,
      required: layer.required,
      tint: layer.tint,
      options: layer.options.map((o) => ({
        id: o.id,
        file: `${layer.key}/${o.id}.png`,
        tintable: layer.tint !== null && !o.fixed,
        ...(o.overlay ? { overlay: overlayFile(layer.key, o.id) } : {}),
        ...(o.hides ? { hides: o.hides } : {}),
        ...(o.seasonal ? { seasonal: true } : {}),
      })),
    })),
    defaults: DEFAULTS,
  };
}
