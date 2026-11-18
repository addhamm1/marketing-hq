import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { avatarConfigSchema, defaultConfig, manifestSchema, randomConfig, savedLooksSchema, validateAgainstManifest } from "./config";
import {
  SEASONAL_ITEMS,
  type SeasonalEvent,
  activeSeasonalItems,
  blockedSeasonalItems,
  daysBetween,
  pickItem,
  resolveSeasonal,
  seasonCalendar,
} from "./seasonal";
import type { AvatarConfig } from "./types";

const spritesDir = path.resolve(import.meta.dirname, "../../../public/sprites");
const manifest = manifestSchema.parse(JSON.parse(readFileSync(path.join(spritesDir, "manifest.json"), "utf8")));
const base = defaultConfig(manifest);
const none = new Set<string>();

const event = (over: Partial<SeasonalEvent>): SeasonalEvent => ({
  key: "e",
  name_en: "E",
  name_ar: "ع",
  starts_on: "2026-12-20",
  ends_on: "2027-01-08",
  items: ["winter-sweater"],
  is_active: true,
  ...over,
});

describe("catalogue and manifest", () => {
  const options = manifest.layers.flatMap((l) => l.options.map((o) => ({ layer: l.key, ...o })));

  it("has a sprite file for every option and overlay", () => {
    for (const o of options) {
      expect(existsSync(path.join(spritesDir, o.file)), o.file).toBe(true);
      if (o.overlay) expect(existsSync(path.join(spritesDir, o.overlay)), o.overlay).toBe(true);
    }
  });

  it("marks exactly the seasonal catalogue ids as seasonal, on the right layer", () => {
    const seasonal = options.filter((o) => o.seasonal);
    expect(seasonal.map((o) => o.id).sort()).toEqual(Object.keys(SEASONAL_ITEMS).sort());
    for (const o of seasonal) expect(o.layer).toBe(SEASONAL_ITEMS[o.id]);
  });

  it("covers every item listed by the seeded seasonal events", () => {
    const sql = readFileSync(path.resolve(import.meta.dirname, "../../../supabase/migrations/20261118000001_people_celebrations.sql"), "utf8");
    const listed = [...sql.matchAll(/'\{([a-z-]+(?:,[a-z-]+)*)\}'\)/g)].flatMap((m) => m[1].split(","));
    expect(listed.length).toBeGreaterThan(0);
    for (const id of listed) expect(Object.keys(SEASONAL_ITEMS)).toContain(id);
  });

  it("keeps every option id from before the wardrobe grew", () => {
    const ids = options.map((o) => o.id);
    for (const id of ["b1", "b2", "pants", "skirt", "shorts", "tshirt", "hoodie-espaces", "shirt", "blazer", "sneakers", "boots", "short", "long", "curly", "bun", "buzz", "beard", "mustache", "cap", "beanie", "hijab-classic", "hijab-wrap", "hijab-sport", "round", "square", "headphones", "lanyard"]) {
      expect(ids).toContain(id);
    }
  });

  it("offers the Espaces brand colours for clothing", () => {
    for (const c of ["#F7D139", "#040707", "#2A2A29", "#EBE6DD", "#2D6372", "#FAA41A", "#D62C27"]) expect(manifest.palettes.clothing).toContain(c);
  });
});

describe("older saved configs", () => {
  const old = { body: "b2", skin: "#8d5524", hair: "curly", hairColor: "#1a1410", top: "blazer", topColor: "#111827", bottom: "skirt", bottomColor: "#374151", shoes: "boots", shoesColor: "#111827", headwear: "hijab-wrap", headwearColor: "#be185d", glasses: "round", accessory: "lanyard" };

  it("still validates and keeps every choice", () => {
    expect(avatarConfigSchema.safeParse(old).success).toBe(true);
    expect(validateAgainstManifest(old, manifest)).toMatchObject(old);
  });

  it("is untouched by the seasonal resolver", () => {
    const cleaned = validateAgainstManifest(old, manifest);
    expect(resolveSeasonal(cleaned, manifest, none)).toEqual(cleaned);
  });
});

describe("resolveSeasonal", () => {
  const dressed = pickItem(pickItem({ ...base, top: "polo", accessory: null }, manifest, "top", "winter-sweater"), manifest, "accessory", "winter-scarf");

  it("wears the seasonal item while its event runs", () => {
    expect(resolveSeasonal(dressed, manifest, new Set(["winter-sweater", "winter-scarf"]))).toEqual(dressed);
  });

  it("falls back to the regular item when the event ends", () => {
    const worn = resolveSeasonal(dressed, manifest, none);
    expect(worn.top).toBe("polo");
    expect(worn.accessory).toBeNull();
  });

  it("does not change the saved choice", () => {
    const before = structuredClone(dressed);
    resolveSeasonal(dressed, manifest, none);
    expect(dressed).toEqual(before);
    expect(dressed.top).toBe("winter-sweater");
  });

  it("uses the manifest default when no regular item was remembered", () => {
    expect(resolveSeasonal({ ...base, top: "eid-kaftan" }, manifest, none).top).toBe("hoodie-espaces");
    expect(resolveSeasonal({ ...base, headwear: "party-hat" }, manifest, none).headwear).toBeNull();
  });

  it("never falls back to another seasonal item", () => {
    const config: AvatarConfig = { ...base, top: "eid-kaftan", regular: { top: "winter-sweater" } };
    expect(resolveSeasonal(config, manifest, none).top).toBe("hoodie-espaces");
  });

  it("survives validation with the remembered item intact", () => {
    const cleaned = validateAgainstManifest(dressed, manifest);
    expect(cleaned.top).toBe("winter-sweater");
    expect(cleaned.regular?.top).toBe("polo");
  });
});

describe("pickItem", () => {
  it("remembers the first regular item across seasonal swaps", () => {
    const one = pickItem({ ...base, top: "polo" }, manifest, "top", "winter-sweater");
    const two = pickItem(one, manifest, "top", "eid-kaftan");
    expect(two.regular?.top).toBe("polo");
  });

  it("forgets it once a regular item is chosen", () => {
    const one = pickItem({ ...base, top: "polo" }, manifest, "top", "winter-sweater");
    expect(pickItem(one, manifest, "top", "shirt").regular).toBeUndefined();
  });
});

describe("blockedSeasonalItems", () => {
  const next = { ...base, top: "winter-sweater" };

  it("refuses a new out-of-season pick", () => {
    expect(blockedSeasonalItems(next, base, manifest, none)).toEqual(["winter-sweater"]);
  });

  it("allows it while the event runs", () => {
    expect(blockedSeasonalItems(next, base, manifest, new Set(["winter-sweater"]))).toEqual([]);
  });

  it("allows keeping a choice saved during the event", () => {
    expect(blockedSeasonalItems(next, next, manifest, none)).toEqual([]);
  });
});

describe("season dates", () => {
  it("counts both the first and the last day as in season", () => {
    expect(activeSeasonalItems([event({})], "2026-12-20").has("winter-sweater")).toBe(true);
    expect(activeSeasonalItems([event({})], "2027-01-08").has("winter-sweater")).toBe(true);
    expect(activeSeasonalItems([event({})], "2026-12-19").size).toBe(0);
    expect(activeSeasonalItems([event({})], "2027-01-09").size).toBe(0);
  });

  it("ignores events switched off by an admin", () => {
    expect(activeSeasonalItems([event({ is_active: false })], "2026-12-25").size).toBe(0);
  });

  it("reports days left, with the last day as 1", () => {
    expect(seasonCalendar([event({})], "2027-01-08").now[0].daysLeft).toBe(1);
    expect(seasonCalendar([event({})], "2027-01-06").now[0].daysLeft).toBe(3);
  });

  it("finds the nearest upcoming event", () => {
    const later = event({ key: "later", starts_on: "2027-02-07", ends_on: "2027-03-09" });
    const { now, next } = seasonCalendar([later, event({})], "2026-11-18");
    expect(now).toEqual([]);
    expect(next?.key).toBe("e");
    expect(next?.daysUntil).toBe(32);
  });

  it("crosses the summer-time change without drifting", () => {
    expect(daysBetween("2027-04-20", "2027-05-05")).toBe(15);
  });
});

describe("randomConfig and looks", () => {
  it("never draws an out-of-season item", () => {
    for (let i = 0; i < 300; i++) {
      const config = randomConfig(manifest);
      for (const key of ["top", "headwear", "accessory"] as const) expect(Object.keys(SEASONAL_ITEMS)).not.toContain(config[key]);
    }
  });

  it("accepts three looks and refuses a fourth or a repeated slot", () => {
    const look = (slot: number) => ({ slot, name: "Work", config: base });
    expect(savedLooksSchema.safeParse([look(0), look(1), look(2)]).success).toBe(true);
    expect(savedLooksSchema.safeParse([look(0), look(1), look(2), look(2)]).success).toBe(false);
    expect(savedLooksSchema.safeParse([look(1), look(1)]).success).toBe(false);
  });

  it("refuses a blank look name", () => {
    expect(savedLooksSchema.safeParse([{ slot: 0, name: "   ", config: base }]).success).toBe(false);
  });
});
