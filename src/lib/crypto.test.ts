import { describe, expect, it } from "vitest";
import { safeEqual, temporaryPassword } from "./crypto";

describe("crypto helpers", () => {
  it("compares secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("makes temporary passwords without look-alike characters", () => {
    const p = temporaryPassword();
    expect(p).toHaveLength(14);
    expect(p).not.toMatch(/[0O1lI]/);
  });
});
