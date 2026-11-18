import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { avatarConfigSchema, configHash, defaultConfig, hiddenLayers, manifestSchema, randomConfig, validateAgainstManifest } from "./config";
import type { AvatarConfig } from "./types";

const manifest = manifestSchema.parse(
  JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../public/sprites/manifest.json"), "utf8")),
);

/** Deterministic PRNG so random tests are reproducible. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("configHash", () => {
  it("is stable regardless of key order", () => {
    const a: AvatarConfig = { body: "b1", skin: "#c68642", top: "tshirt", bottom: "pants", shoes: "boots", hair: null };
    const b: AvatarConfig = { hair: null, shoes: "boots", bottom: "pants", top: "tshirt", skin: "#c68642", body: "b1" };
    expect(configHash(a)).toBe(configHash(b));
  });

  it("changes when a value changes and ignores undefined fields", () => {
    const base = defaultConfig(manifest);
    expect(configHash({ ...base, topColor: "#111827" })).not.toBe(configHash(base));
    const { glasses: _omit, ...withoutGlasses } = base;
    expect(configHash({ ...base, glasses: undefined })).toBe(configHash(withoutGlasses));
  });
});

describe("validateAgainstManifest", () => {
  it("returns the manifest defaults for garbage input", () => {
    const cleaned = validateAgainstManifest("nope", manifest);
    expect(cleaned).toEqual(defaultConfig(manifest));
    expect(cleaned.top).toBe("hoodie-espaces");
    expect(cleaned.topColor).toBe("#0F4C5C");
  });

  it("falls back to defaults for unknown option ids and bad colours", () => {
    const cleaned = validateAgainstManifest(
      { body: "b9", skin: "red", hair: "mohawk", top: "shirt", bottom: "parachute", shoes: "boots", glasses: "monocle" },
      manifest,
    );
    expect(cleaned.body).toBe("b1");
    expect(cleaned.skin).toBe("#c68642");
    expect(cleaned.hair).toBe("short");
    expect(cleaned.top).toBe("shirt");
    expect(cleaned.bottom).toBe("pants");
    expect(cleaned.shoes).toBe("boots");
    expect(cleaned.glasses).toBeNull();
    expect(avatarConfigSchema.safeParse(cleaned).success).toBe(true);
  });

  it("keeps an explicit null for optional layers", () => {
    expect(validateAgainstManifest({ ...defaultConfig(manifest), hair: null }, manifest).hair).toBeNull();
  });
});

describe("randomConfig", () => {
  it("only picks options and colours that exist in the manifest", () => {
    const rand = seeded(42);
    for (let i = 0; i < 200; i++) {
      const config = randomConfig(manifest, rand);
      expect(avatarConfigSchema.safeParse(config).success).toBe(true);
      for (const layer of manifest.layers) {
        const id = config[layer.key];
        if (layer.required) expect(id).toBeTruthy();
        if (id) expect(layer.options.map((o) => o.id)).toContain(id);
      }
      expect(manifest.palettes.skin).toContain(config.skin);
      expect(manifest.palettes.clothing).toContain(config.topColor);
    }
  });

  it("handles a rand() that returns the upper edge", () => {
    expect(avatarConfigSchema.safeParse(randomConfig(manifest, () => 0.999999)).success).toBe(true);
  });
});

describe("hiddenLayers", () => {
  it("hides hair under a hijab", () => {
    expect(hiddenLayers({ ...defaultConfig(manifest), headwear: "hijab-classic" }, manifest).has("hair")).toBe(true);
    expect(hiddenLayers({ ...defaultConfig(manifest), headwear: "cap" }, manifest).has("hair")).toBe(false);
  });
});
