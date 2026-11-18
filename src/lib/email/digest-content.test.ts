import { describe, expect, it } from "vitest";
import type { MyDay } from "@/features/my-day/types";
import { digestDue, parseDigestHour, renderDigest } from "./digest-content";

const day = (over: Partial<MyDay> = {}): MyDay => ({
  meetings: { ok: true, items: [] },
  cards: { ok: true, items: [] },
  approvals: { ok: true, items: [] },
  gates: { ok: true, items: [] },
  shoots: { ok: true, items: [] },
  actions: { ok: true, items: [] },
  celebrations: { ok: true, items: [] },
  ...over,
});

const now = new Date("2026-11-18T06:00:00Z");
const base = { locale: "en" as const, name: "Sara", userId: "me", now, appUrl: "https://hq.test" };
const card = (id: string, title: string) => ({ id, boardId: "b", title, dueAt: "2026-11-18T15:00:00Z", overdue: false });

describe("digestDue", () => {
  it("follows Cairo's clock through winter and summer time", () => {
    expect(digestDue(new Date("2026-01-14T06:00:00Z"), 8)).toBe(true); // UTC+2
    expect(digestDue(new Date("2026-01-14T05:00:00Z"), 8)).toBe(false);
    expect(digestDue(new Date("2026-07-15T05:00:00Z"), 8)).toBe(true); // UTC+3
    expect(digestDue(new Date("2026-07-15T06:00:00Z"), 8)).toBe(false);
  });

  it("stays quiet on Fridays and holidays, and sends on Saturdays", () => {
    expect(digestDue(new Date("2026-11-20T06:00:00Z"), 8)).toBe(false); // Friday
    expect(digestDue(new Date("2026-11-21T06:00:00Z"), 8)).toBe(true); // Saturday
    expect(digestDue(new Date("2026-11-18T06:00:00Z"), 8, new Set(["2026-11-18"]))).toBe(false);
  });
});

describe("parseDigestHour", () => {
  it("reads numbers and numeric text", () => {
    expect(parseDigestHour(9)).toBe(9);
    expect(parseDigestHour("7")).toBe(7);
    expect(parseDigestHour(0)).toBe(0);
  });

  it("falls back to 8 for anything unusable", () => {
    for (const value of [null, undefined, "", "soon", 24, -1, 8.5, {}]) expect(parseDigestHour(value)).toBe(8);
  });
});

describe("renderDigest", () => {
  it("escapes titles so card text can't inject markup", () => {
    const { html, text } = renderDigest({
      ...base,
      day: day({ cards: { ok: true, items: [card("c1", `<img src=x onerror="alert(1)">`)] } }),
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(text).toContain("<img"); // Plain text is shown as text.
  });

  it("leaves out empty sections and shortens long ones", () => {
    const items = Array.from({ length: 7 }, (_, i) => card(`c${i}`, `Card ${i}`));
    const { html } = renderDigest({ ...base, day: day({ cards: { ok: true, items } }) });
    expect(html).toContain("Cards due");
    expect(html).not.toContain("Today&#39;s meetings");
    expect(html).toContain("Card 4");
    expect(html).not.toContain("Card 5");
    expect(html).toContain("and 2 more");
  });

  it("writes in Arabic, right to left, with the links in that language", () => {
    const { html, subject } = renderDigest({
      ...base,
      locale: "ar",
      day: day({ cards: { ok: true, items: [card("c1", "حملة")] } }),
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("https://hq.test/ar/me/account");
    expect(subject).toContain("يومك");
  });

  it("does not list the reader's own birthday among colleagues", () => {
    const celebrations = {
      ok: true,
      items: [
        { userId: "me", name: "Sara", kind: "birthday" as const, years: null },
        { userId: "u2", name: "Omar", kind: "birthday" as const, years: null },
      ],
    };
    const { text } = renderDigest({ ...base, day: day({ celebrations }) });
    expect(text).toContain("Omar's birthday");
    expect(text).not.toContain("Sara's birthday");
  });
});
