import { describe, expect, it } from "vitest";
import { base32, qrToken, qrWindow, safeEqual, temporaryPassword, verifyQrToken } from "./crypto";

describe("crypto helpers", () => {
  it("encodes RFC 4648 base32 test vectors", () => {
    const enc = (s: string) => base32(new TextEncoder().encode(s));
    expect(enc("f")).toBe("MY");
    expect(enc("foobar")).toBe("MZXW6YTBOI");
  });

  it("compares secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("accepts the current and previous QR windows only", () => {
    const now = Date.UTC(2026, 9, 12, 8, 0, 30);
    const w = qrWindow(now);
    const secret = "s3cret";
    const branch = "branch-1";
    expect(qrToken(secret, branch, w)).toHaveLength(10);
    expect(verifyQrToken(secret, branch, qrToken(secret, branch, w), now)).toBe(true);
    expect(verifyQrToken(secret, branch, qrToken(secret, branch, w - 1), now)).toBe(true);
    expect(verifyQrToken(secret, branch, qrToken(secret, branch, w - 2), now)).toBe(false);
    expect(verifyQrToken(secret, "other", qrToken(secret, branch, w), now)).toBe(false);
  });

  it("makes temporary passwords without look-alike characters", () => {
    const p = temporaryPassword();
    expect(p).toHaveLength(14);
    expect(p).not.toMatch(/[0O1lI]/);
  });
});
