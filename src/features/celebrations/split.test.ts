import { describe, expect, it } from "vitest";
import { kudosSchema } from "./schemas";
import { daysBetween, splitCelebrations } from "./split";
import type { Celebration } from "./types";

const at = (day: string, kind: Celebration["kind"] = "birthday"): Celebration => ({
  user_id: "00000000-0000-4000-8000-000000000006", display_name: "Mona", kind, day, years: kind === "birthday" ? null : 2,
});

describe("splitCelebrations", () => {
  it("separates today from what is coming", () => {
    const all = [at("2026-11-18"), at("2026-11-18", "anniversary"), at("2026-11-19"), at("2026-12-18")];
    const { today, upcoming } = splitCelebrations(all, "2026-11-18");
    expect(today).toHaveLength(2);
    expect(upcoming.map((c) => c.day)).toEqual(["2026-11-19", "2026-12-18"]);
  });

  it("drops anything already past", () => {
    const { today, upcoming } = splitCelebrations([at("2026-11-17")], "2026-11-18");
    expect(today).toEqual([]);
    expect(upcoming).toEqual([]);
  });
});

describe("daysBetween", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2026-11-18", "2026-11-19")).toBe(1);
    expect(daysBetween("2026-11-18", "2026-12-18")).toBe(30);
  });

  it("is not thrown by Egypt's clock changes", () => {
    expect(daysBetween("2027-04-29", "2027-05-01")).toBe(2);
    expect(daysBetween("2026-10-29", "2026-10-31")).toBe(2);
  });
});

describe("kudosSchema", () => {
  const valid = { to_id: "00000000-0000-4000-8000-000000000007", badge: "teamwork", message: "Thank you for the save" };

  it("accepts a normal kudos and trims the message", () => {
    const parsed = kudosSchema.parse({ ...valid, message: "  Thanks  " });
    expect(parsed.message).toBe("Thanks");
  });

  it("allows exactly 280 characters and no more", () => {
    expect(kudosSchema.safeParse({ ...valid, message: "x".repeat(280) }).success).toBe(true);
    const long = kudosSchema.safeParse({ ...valid, message: "x".repeat(281) });
    expect(long.error?.issues[0].message).toBe("celebrations.errors.messageTooLong");
  });

  it("refuses an empty message", () => {
    expect(kudosSchema.safeParse({ ...valid, message: "   " }).error?.issues[0].message).toBe("celebrations.errors.message");
  });

  it("needs a person", () => {
    expect(kudosSchema.safeParse({ ...valid, to_id: "" }).error?.issues[0].message).toBe("celebrations.errors.person");
  });

  it("keeps the birthday badge for the one-tap wish", () => {
    expect(kudosSchema.safeParse({ ...valid, badge: "birthday" }).success).toBe(false);
  });
});
