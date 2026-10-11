import { describe, expect, it } from "vitest";
import { aspectIssue } from "./media-process";

describe("aspectIssue", () => {
  it("warns about horizontal media on reels and stories", () => {
    expect(aspectIssue("reel", 1920, 1080)).toBe("horizontal");
    expect(aspectIssue("story", 1080, 1920)).toBeNull();
  });
  it("warns about tall media in the feed", () => {
    expect(aspectIssue("feed", 1080, 1920)).toBe("vertical");
    expect(aspectIssue("feed", 1080, 1350)).toBeNull();
  });
  it("ignores unknown sizes", () => {
    expect(aspectIssue("reel", null, null)).toBeNull();
  });
});
