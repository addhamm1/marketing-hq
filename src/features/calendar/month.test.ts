import { describe, expect, it } from "vitest";
import { monthGrid, overlaps } from "./month";

describe("calendar helpers", () => {
  it("starts the grid on Saturday", () => {
    const grid = monthGrid("2026-10"); // 1 Oct 2026 is a Thursday
    expect(grid[0].date).toBe("2026-09-26"); // Saturday
    expect(grid.find((c) => c.inMonth)?.date).toBe("2026-10-01");
    expect(grid.length % 7).toBe(0);
  });

  it("warns when two people from one team are on leave the same day", () => {
    const teams = new Map([["a", "t1"], ["b", "t1"], ["c", "t2"]]);
    const abs = [
      { user_id: "a", category: "leave" as const, starts_on: "2026-10-10", ends_on: "2026-10-12" },
      { user_id: "b", category: "leave" as const, starts_on: "2026-10-12", ends_on: "2026-10-12" },
      { user_id: "c", category: "leave" as const, starts_on: "2026-10-12", ends_on: "2026-10-12" },
    ];
    expect(overlaps(abs, teams, ["2026-10-11", "2026-10-12"])).toEqual([{ date: "2026-10-12", teamId: "t1", userIds: ["a", "b"] }]);
  });
});
