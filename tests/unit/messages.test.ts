import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("English and Arabic have exactly the same keys", () => {
    const e = keys(en).sort();
    const a = keys(ar).sort();
    expect(a.filter((k) => !e.includes(k))).toEqual([]);
    expect(e.filter((k) => !a.includes(k))).toEqual([]);
  });

  it("Arabic strings use Latin digits (DECISIONS D-09)", () => {
    const flat = JSON.stringify(ar);
    expect(/[٠-٩]/.test(flat)).toBe(false);
  });
});
