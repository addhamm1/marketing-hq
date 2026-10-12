import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SIGN_KEYS } from "@/features/map/signs";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { MIN_SCREEN_FONT, readSigns, resolveAccent, signScale, signText, textResolution } from "./signage";

const hq: unknown = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../public/maps/hq.json"), "utf8"));

describe("signage", () => {
  it("reads every HQ sign, and each has a label in English and Arabic", () => {
    const signs = readSigns(hq);
    expect(signs.map((s) => s.key).sort()).toEqual([...SIGN_KEYS].sort());
    for (const key of SIGN_KEYS) {
      expect(en.map.signs[key], key).toBeTruthy();
      expect(ar.map.signs[key], key).toBeTruthy();
    }
    expect(signs.find((s) => s.key === "pod-creative")?.accent).toBe("team:creative");
  });

  it("resolves accents: team colour, literal colour, or Espaces yellow", () => {
    const teams = { creative: "#8B5CF6" };
    expect(resolveAccent("team:creative", teams)).toBe("#8B5CF6");
    expect(resolveAccent("team:unknown", teams)).toBe("#F7D139");
    expect(resolveAccent("#2D6372", teams)).toBe("#2D6372");
    expect(resolveAccent("not-a-colour", teams)).toBe("#F7D139");
    expect(resolveAccent(null, teams)).toBe("#F7D139");
  });

  it("grows signs only when zoomed out, within limits", () => {
    expect(signScale(2, 9)).toBe(1);
    expect(signScale(1, 9)).toBe(1);
    const phone = signScale(0.37, 9);
    expect(phone).toBeGreaterThan(1);
    expect(phone).toBeLessThanOrEqual(2);
    expect(signScale(0.7, 9) * 9 * 0.7).toBeGreaterThanOrEqual(MIN_SCREEN_FONT);
    expect(signScale(0, 9)).toBe(1);
  });

  it("renders text at a whole-number resolution that covers the zoom", () => {
    expect(textResolution(0.4)).toBe(2);
    expect(textResolution(3.2)).toBe(4);
    expect(textResolution(1.3, 1.5)).toBe(2);
    expect(textResolution(20)).toBe(8);
  });

  it("uppercases Latin labels and leaves Arabic alone", () => {
    expect(signText("Meeting room")).toBe("MEETING ROOM");
    expect(signText("غرفة الاجتماعات")).toBe("غرفة الاجتماعات");
  });

  it("returns no signs for maps without a signs layer", () => {
    expect(readSigns({ layers: [{ name: "zones", objects: [] }] })).toEqual([]);
    expect(readSigns("nope")).toEqual([]);
  });
});
