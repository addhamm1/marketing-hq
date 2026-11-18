import { describe, expect, it } from "vitest";
import { nextSeriesDate, weekdayList, type SeriesRule } from "./series-rule";

const base: SeriesRule = { cadence: "daily", weekdays: [], month_days: [], start_time: "10:15:00", starts_on: "2026-01-01", ends_on: null };
// Wednesday 18 November 2026, 09:00 in Cairo.
const NOW = new Date("2026-11-18T07:00:00Z");

describe("nextSeriesDate", () => {
  it("is today while the start time is still ahead", () => {
    expect(nextSeriesDate(base, NOW)).toBe("2026-11-18");
  });

  it("moves to the next working day once the time has passed", () => {
    expect(nextSeriesDate(base, new Date("2026-11-18T09:00:00Z"))).toBe("2026-11-19");
  });

  it("skips Friday", () => {
    // Thursday afternoon: Friday is off, so Saturday is next.
    expect(nextSeriesDate(base, new Date("2026-11-19T12:00:00Z"))).toBe("2026-11-21");
  });

  it("skips a holiday", () => {
    expect(nextSeriesDate(base, NOW, new Set(["2026-11-18"]))).toBe("2026-11-19");
  });

  it("waits for the first day of the series", () => {
    expect(nextSeriesDate({ ...base, starts_on: "2026-11-21" }, NOW)).toBe("2026-11-21");
  });

  it("is empty once the series has ended", () => {
    expect(nextSeriesDate({ ...base, ends_on: "2026-11-10" }, NOW)).toBeNull();
  });

  it("finds the next chosen weekday", () => {
    // Sunday and Wednesday, after Wednesday's meeting has started.
    const rule: SeriesRule = { ...base, cadence: "weekly", weekdays: [0, 3], start_time: "08:00:00" };
    expect(nextSeriesDate(rule, NOW)).toBe("2026-11-22");
  });

  it("finds the next monthly day", () => {
    const rule: SeriesRule = { ...base, cadence: "monthly", month_days: [10, 25] };
    expect(nextSeriesDate(rule, NOW)).toBe("2026-11-25");
  });

  it("goes to next month when this month's days are over", () => {
    const rule: SeriesRule = { ...base, cadence: "monthly", month_days: [5] };
    expect(nextSeriesDate(rule, NOW)).toBe("2026-12-05");
  });

  it("uses the last day of a short month", () => {
    const rule: SeriesRule = { ...base, cadence: "monthly", month_days: [31] };
    // 30 November 2026 is a Monday.
    expect(nextSeriesDate(rule, NOW)).toBe("2026-11-30");
  });

  it("moves a monthly day on a Friday back to Thursday", () => {
    const rule: SeriesRule = { ...base, cadence: "monthly", month_days: [20] };
    // 20 November 2026 is a Friday.
    expect(nextSeriesDate(rule, NOW)).toBe("2026-11-19");
  });

  it("crosses the end of the year", () => {
    const rule: SeriesRule = { ...base, cadence: "monthly", month_days: [5] };
    expect(nextSeriesDate(rule, new Date("2026-12-20T07:00:00Z"))).toBe("2027-01-05");
  });
});

describe("weekdayList", () => {
  it("lists days in work-week order, Saturday first", () => {
    expect(weekdayList([3, 6, 0], "en")).toEqual(["Sat", "Sun", "Wed"]);
  });
});
