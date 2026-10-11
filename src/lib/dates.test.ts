import { describe, expect, it } from "vitest";
import { cairoDateString, cairoHour, cairoInstant, countWorkingDays, isWorkingDay } from "./dates";

describe("Cairo dates", () => {
  it("maps instants to Cairo calendar dates", () => {
    // 22:30 UTC on 1 Jan is 00:30 on 2 Jan in Cairo (UTC+2 in winter).
    expect(cairoDateString(new Date("2026-01-01T22:30:00Z"))).toBe("2026-01-02");
  });

  it("follows Egypt's summer time instead of a fixed offset", () => {
    // In July Cairo is UTC+3.
    expect(cairoHour(new Date("2026-07-01T20:00:00Z"))).toBe(23);
    expect(cairoHour(new Date("2026-01-01T20:00:00Z"))).toBe(22);
    expect(cairoInstant("2026-07-01", "10:00").toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(cairoInstant("2026-01-01", "10:00").toISOString()).toBe("2026-01-01T08:00:00.000Z");
  });

  it("treats Friday as off", () => {
    expect(isWorkingDay("2026-10-16")).toBe(false); // Friday
    expect(isWorkingDay("2026-10-17")).toBe(true); // Saturday
  });

  it("counts working days across a weekend and a holiday", () => {
    // Thu 15 Oct to Sun 18 Oct 2026: Thu, (Fri off), Sat, Sun = 3
    expect(countWorkingDays("2026-10-15", "2026-10-18")).toBe(3);
    expect(countWorkingDays("2026-10-15", "2026-10-18", new Set(["2026-10-17"]))).toBe(2);
    expect(countWorkingDays("2026-10-18", "2026-10-15")).toBe(0);
  });
});
