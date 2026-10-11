import { describe, expect, it } from "vitest";
import { placeCharacters } from "./place";

const base = {
  people: [
    { id: "a", name: "A", title: null, teamId: "t", presence: "available" as const, homeBranchId: "b1" },
    { id: "b", name: "B", title: null, teamId: null, presence: "focus" as const, homeBranchId: "b1" },
    { id: "c", name: "C", title: null, teamId: null, presence: "away" as const, homeBranchId: "b1" },
  ],
  teamColors: { t: "#ff0000" },
  desks: [{ branch_id: "b1", zone_name: "desk-2", assigned_user_id: "b" }],
  onLeaveToday: [] as string[],
};
const zones = ["reception", "desk-1", "desk-2", "desk-3", "spot-1", "spot-2"];

describe("placeCharacters", () => {
  it("puts people at their assigned desk, others at the first free desk", () => {
    const sessions = [
      { user_id: "a", branch_id: "b1", method: "wifi", checked_in_at: "x", field_card_id: null, note: null },
      { user_id: "b", branch_id: "b1", method: "qr", checked_in_at: "x", field_card_id: null, note: null },
    ];
    const placed = placeCharacters({ ...base, sessions }, "b1", zones);
    expect(placed.find((p) => p.userId === "b")?.spot).toBe("desk-2");
    expect(placed.find((p) => p.userId === "a")?.spot).toBe("desk-1");
    expect(placed.find((p) => p.userId === "a")?.teamColor).toBe("#ff0000");
  });

  it("uses spots on the field and home maps", () => {
    const sessions = [{ user_id: "c", branch_id: null, method: "field", checked_in_at: "x", field_card_id: null, note: null }];
    expect(placeCharacters({ ...base, sessions }, "field", zones)).toMatchObject([{ userId: "c", spot: "spot-1" }]);
    expect(placeCharacters({ ...base, sessions }, "home", zones)).toEqual([]);
  });

  it("shows a leave sign at the desk of someone on leave", () => {
    const placed = placeCharacters({ ...base, sessions: [], onLeaveToday: ["b"] }, "b1", zones);
    expect(placed).toMatchObject([{ userId: "b", spot: "desk-2", onLeave: true }]);
  });
});
