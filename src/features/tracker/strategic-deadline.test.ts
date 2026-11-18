import { describe, expect, it } from "vitest";
import { readDeadlineDay, strategicDeadline } from "./strategic-deadline";

describe("strategicDeadline", () => {
  it("counts the days left to a deadline on a working day", () => {
    // 25 Nov 2026 is a Wednesday.
    expect(strategicDeadline("2026-11-18", 25)).toEqual({ deadline: "2026-11-25", forMonth: "2026-12-01", daysLeft: 7 });
  });

  it("is zero on the day itself and negative afterwards", () => {
    expect(strategicDeadline("2026-11-25", 25).daysLeft).toBe(0);
    expect(strategicDeadline("2026-11-28", 25).daysLeft).toBe(-3);
  });

  it("rolls a Friday back to Thursday", () => {
    // 25 Dec 2026 is a Friday.
    expect(strategicDeadline("2026-12-01", 25).deadline).toBe("2026-12-24");
  });

  it("rolls back over a full holiday and the Friday before it", () => {
    // 26 Sep 2026 is a Saturday, and the day before it a Friday.
    expect(strategicDeadline("2026-09-01", 26, new Set(["2026-09-26"])).deadline).toBe("2026-09-24");
  });

  it("plans for January when the year is ending", () => {
    expect(strategicDeadline("2026-12-10", 25).forMonth).toBe("2027-01-01");
  });

  it("uses the deadline of the current month after this month's has passed", () => {
    const result = strategicDeadline("2026-11-30", 25);
    expect(result.deadline).toBe("2026-11-25");
    expect(result.forMonth).toBe("2026-12-01");
  });

  it("can roll back into the month before", () => {
    // 1 May 2026 is a Friday.
    expect(strategicDeadline("2026-05-01", 1).deadline).toBe("2026-04-30");
  });
});

describe("readDeadlineDay", () => {
  it("reads the setting and falls back to the 25th", () => {
    expect(readDeadlineDay(20)).toBe(20);
    expect(readDeadlineDay("20")).toBe(20);
    expect(readDeadlineDay(null)).toBe(25);
    expect(readDeadlineDay(0)).toBe(25);
    expect(readDeadlineDay(40)).toBe(25);
  });
});
