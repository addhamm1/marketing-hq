import { describe, expect, it } from "vitest";
import { addDaysTo, daysBetween, dayPart, lateSince } from "./format";
import { agendaCount, celebrationsOn, gateDue, isAllClear, type CelebrationPerson } from "./summary";
import type { MyDay } from "./types";

const empty = (): MyDay => ({
  meetings: { ok: true, items: [] },
  cards: { ok: true, items: [] },
  approvals: { ok: true, items: [] },
  gates: { ok: true, items: [] },
  shoots: { ok: true, items: [] },
  actions: { ok: true, items: [] },
  celebrations: { ok: true, items: [] },
});

const person = (over: Partial<CelebrationPerson>): CelebrationPerson => ({
  id: "u1",
  full_name: "Sara Ali",
  display_name: null,
  birth_month: null,
  birth_day: null,
  joined_on: null,
  celebrate: true,
  ...over,
});

describe("all clear", () => {
  it("is clear when every section loaded empty", () => {
    expect(isAllClear(empty())).toBe(true);
  });

  it("is not clear while a section failed to load", () => {
    expect(isAllClear({ ...empty(), approvals: { ok: false, items: [] } })).toBe(false);
  });

  it("does not count a colleague's birthday as work", () => {
    const day = { ...empty(), celebrations: { ok: true, items: [{ userId: "u", name: "Sara", kind: "birthday" as const, years: null }] } };
    expect(agendaCount(day)).toBe(0);
    expect(isAllClear(day)).toBe(true);
  });
});

describe("gateDue", () => {
  it("labels late, today, tomorrow and later", () => {
    expect(gateDue({ daysLeft: -2 })).toEqual({ key: "gateOverdue", days: 2 });
    expect(gateDue({ daysLeft: 0 }).key).toBe("gateToday");
    expect(gateDue({ daysLeft: 1 }).key).toBe("gateTomorrow");
    expect(gateDue({ daysLeft: 5 })).toEqual({ key: "gateIn", days: 5 });
  });
});

describe("celebrationsOn", () => {
  it("finds birthdays and counts anniversary years", () => {
    const people = [person({ birth_month: 11, birth_day: 18 }), person({ id: "u2", joined_on: "2023-11-18" })];
    expect(celebrationsOn(people, "2026-11-18")).toEqual([
      { userId: "u1", name: "Sara Ali", kind: "birthday", years: null },
      { userId: "u2", name: "Sara Ali", kind: "anniversary", years: 3 },
    ]);
  });

  it("skips the day someone joined and people who opted out", () => {
    expect(celebrationsOn([person({ joined_on: "2026-11-18" })], "2026-11-18")).toEqual([]);
    expect(celebrationsOn([person({ birth_month: 11, birth_day: 18, celebrate: false })], "2026-11-18")).toEqual([]);
  });

  it("marks a 29 February birthday on the 28th only in other years", () => {
    const leap = person({ birth_month: 2, birth_day: 29 });
    expect(celebrationsOn([leap], "2027-02-28")).toHaveLength(1);
    expect(celebrationsOn([leap], "2028-02-28")).toHaveLength(0);
    expect(celebrationsOn([leap], "2028-02-29")).toHaveLength(1);
  });
});

describe("date helpers", () => {
  it("crosses months and Egypt's clock change without drifting", () => {
    expect(addDaysTo("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysTo("2026-04-30", 1)).toBe("2026-05-01");
    expect(daysBetween("2026-04-20", "2026-05-05")).toBe(15);
    expect(daysBetween("2026-11-18", "2026-11-16")).toBe(-2);
  });

  it("names the part of the day from the Cairo hour", () => {
    expect([dayPart(8), dayPart(12), dayPart(17)]).toEqual(["morning", "afternoon", "evening"]);
  });

  it("shows a time for cards late today and a day for older ones", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    expect(lateSince("2026-11-18T08:00:00Z", now, "en")).toBe("10:00");
    // 23:00 UTC on the 16th is already the 17th in Cairo.
    expect(lateSince("2026-11-16T23:00:00Z", now, "en")).toBe("17 Nov");
  });
});
