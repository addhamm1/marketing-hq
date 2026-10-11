import { describe, expect, it } from "vitest";
import { averageClock, countBy, median, rate, weekly } from "./metrics";

describe("report metrics", () => {
  it("median and rate", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(rate(1, 4)).toBe(0.25);
    expect(rate(1, 0)).toBeNull();
  });
  it("weekly buckets start on Saturday", () => {
    const w = weekly(["2026-10-10", "2026-10-11", "2026-10-17"], (x) => x, "2026-10-10", "2026-10-20");
    expect(w).toEqual([{ week: "2026-10-10", count: 2 }, { week: "2026-10-17", count: 1 }]);
  });
  it("average clock time and grouping", () => {
    expect(averageClock(["09:50", "10:10"])).toBe("10:00");
    expect(countBy(["a", "b", "a"], (x) => x)).toEqual([{ name: "a", value: 2 }, { name: "b", value: 1 }]);
  });
});
