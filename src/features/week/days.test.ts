import { describe, expect, it } from "vitest";
import { addDaysTo, currentWeekStart, daysBetween, parseDay, weekDays, weekStartOf, weekdayOf } from "./days";

describe("work week dates", () => {
  it("opens every day of the week on the Saturday before it", () => {
    // 14 Nov 2026 is a Saturday.
    expect(weekdayOf("2026-11-14")).toBe(6);
    for (const d of ["2026-11-14", "2026-11-15", "2026-11-18", "2026-11-19", "2026-11-20"]) {
      expect(weekStartOf(d)).toBe("2026-11-14");
    }
    expect(weekStartOf("2026-11-21")).toBe("2026-11-21");
  });

  it("lists Saturday to Thursday, with no Friday", () => {
    const days = weekDays("2026-11-14");
    expect(days).toEqual(["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(days.map(weekdayOf)).not.toContain(5);
  });

  it("looks ahead on Friday, the day off", () => {
    expect(currentWeekStart("2026-11-20")).toBe("2026-11-21");
    expect(currentWeekStart("2026-11-19")).toBe("2026-11-14");
  });

  it("crosses months, years and the summer time change", () => {
    expect(addDaysTo("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysTo("2027-03-01", -1)).toBe("2027-02-28");
    // Egypt moves its clocks on the last Friday of April.
    expect(daysBetween("2027-04-25", "2027-05-05")).toBe(10);
    expect(daysBetween("2026-11-25", "2026-11-18")).toBe(-7);
  });

  it("accepts only real dates", () => {
    expect(parseDay("2026-11-18")).toBe("2026-11-18");
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay("18-11-2026")).toBeNull();
    expect(parseDay(undefined)).toBeNull();
  });
});
