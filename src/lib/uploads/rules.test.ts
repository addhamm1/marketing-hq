import { describe, expect, it } from "vitest";
import { acceptAttr, BRIEF_MEDIA_RULE, formatBytes, mediaKind, parseLink, pastedName, screenFiles, validateFile } from "./rules";

const MB = 1024 * 1024;
const f = (name: string, type: string, size = 1000) => ({ name, type, size });

describe("validateFile", () => {
  it("accepts images, videos, PDFs and office files", () => {
    for (const file of [f("a.jpg", "image/jpeg"), f("b.mov", "video/quicktime"), f("c.pdf", "application/pdf"), f("d.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")]) {
      expect(validateFile(file, BRIEF_MEDIA_RULE)).toBeNull();
    }
  });
  it("falls back to the extension when the browser gives no type", () => {
    expect(validateFile(f("design.psd", ""), BRIEF_MEDIA_RULE)).toBeNull();
    expect(validateFile(f("tool.exe", ""), BRIEF_MEDIA_RULE)?.key).toBe("badType");
  });
  it("refuses executables, empty files and files over the bucket limit", () => {
    expect(validateFile(f("x.exe", "application/x-msdownload"), BRIEF_MEDIA_RULE)?.key).toBe("badType");
    expect(validateFile(f("a.png", "image/png", 0), BRIEF_MEDIA_RULE)?.key).toBe("empty");
    expect(validateFile(f("big.mp4", "video/mp4", 101 * MB), BRIEF_MEDIA_RULE)).toEqual({ key: "tooBig", params: { name: "big.mp4", max: "100 MB" } });
    expect(validateFile(f("edge.mp4", "video/mp4", 100 * MB), BRIEF_MEDIA_RULE)).toBeNull();
  });
});

describe("screenFiles", () => {
  it("splits accepted files from errors and caps the batch once", () => {
    const rule = { ...BRIEF_MEDIA_RULE, maxFiles: 2 };
    const { accepted, errors } = screenFiles([f("1.png", "image/png"), f("2.exe", "app/x"), f("3.png", "image/png"), f("4.png", "image/png"), f("5.png", "image/png")], rule);
    expect(accepted.map((a) => a.name)).toEqual(["1.png", "3.png"]);
    expect(errors.map((e) => e.key)).toEqual(["badType", "tooMany"]);
  });
  it("counts files already in the list", () => {
    expect(screenFiles([f("1.png", "image/png")], { ...BRIEF_MEDIA_RULE, maxFiles: 3 }, 3).accepted).toHaveLength(0);
  });
});

describe("parseLink", () => {
  it("names well-known services", () => {
    expect(parseLink("https://drive.google.com/file/d/abc/view")).toEqual({ url: "https://drive.google.com/file/d/abc/view", name: "Google Drive" });
    expect(parseLink("we.tl/t-123")?.name).toBe("WeTransfer");
    expect(parseLink("https://www.dropbox.com/s/x")?.name).toBe("Dropbox");
  });
  it("adds https to bare domains and uses the host otherwise", () => {
    expect(parseLink("  example.com/brief ")).toEqual({ url: "https://example.com/brief", name: "example.com" });
  });
  it("rejects non-web schemes, spaces and words", () => {
    expect(parseLink("javascript:alert(1)")).toBeNull();
    expect(parseLink("ftp://x.com/a")).toBeNull();
    expect(parseLink("hello world")).toBeNull();
    expect(parseLink("notalink")).toBeNull();
    expect(parseLink("")).toBeNull();
  });
});

describe("helpers", () => {
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * MB)).toBe("3.5 MB");
    expect(formatBytes(100 * MB)).toBe("100 MB");
  });
  it("classifies media", () => {
    expect(mediaKind("image/png")).toBe("image");
    expect(mediaKind(null, "clip.MOV")).toBe("video");
    expect(mediaKind("application/pdf")).toBe("pdf");
    expect(mediaKind("application/zip", "a.zip")).toBe("other");
  });
  it("names pasted screenshots", () => {
    expect(pastedName("image/png", new Date("2026-10-12T09:30:05Z"))).toBe("screenshot-20261012-093005.png");
    expect(pastedName("image/jpeg")).toMatch(/\.jpg$/);
  });
  it("builds an accept attribute", () => {
    expect(acceptAttr({ ...BRIEF_MEDIA_RULE, mimes: ["image/*"], extensions: ["psd"] })).toBe("image/*,.psd");
  });
});
