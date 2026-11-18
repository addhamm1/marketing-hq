import { describe, expect, it } from "vitest";
import type { Access, AppRole } from "@/lib/auth/access";
import { canPlanFor, copyPlanRows, isPlannableDay, type PlanEntry } from "./plan-rules";

const viewer = (...roles: AppRole[]) =>
  ({ user_id: "me", roles: roles.map((role) => ({ role, team_id: null })) }) as unknown as Access;

describe("who can plan", () => {
  it("lets staff plan their own days only", () => {
    expect(canPlanFor(viewer("member"), "me")).toBe(true);
    expect(canPlanFor(viewer("requester"), "me")).toBe(true);
    expect(canPlanFor(viewer("member"), "someone")).toBe(false);
    expect(canPlanFor(viewer("team_lead"), "someone")).toBe(false);
  });

  it("lets super admins and traffic managers plan for anyone", () => {
    expect(canPlanFor(viewer("traffic_manager"), "someone")).toBe(true);
    expect(canPlanFor(viewer("super_admin"), "someone")).toBe(true);
  });

  it("refuses guests and people with no role, even for themselves", () => {
    expect(canPlanFor(viewer("guest"), "me")).toBe(false);
    expect(canPlanFor(viewer(), "me")).toBe(false);
  });
});

describe("which days can change", () => {
  it("keeps past days read-only and leaves Friday out", () => {
    expect(isPlannableDay("2026-11-17", "2026-11-18")).toBe(false);
    expect(isPlannableDay("2026-11-18", "2026-11-18")).toBe(true);
    expect(isPlannableDay("2026-11-19", "2026-11-18")).toBe(true);
    expect(isPlannableDay("2026-11-20", "2026-11-18")).toBe(false);
  });
});

describe("copy last week", () => {
  const branch = "branch-1";
  const lastWeek: PlanEntry[] = [
    { day: "2026-11-07", kind: "branch", branch_id: branch, place: null }, // Saturday, now past
    { day: "2026-11-11", kind: "home", branch_id: null, place: null }, // Wednesday: today
    { day: "2026-11-12", kind: "field", branch_id: null, place: "Zamalek" }, // Thursday
  ];
  const input = { week: "2026-11-14", today: "2026-11-18", plannedDays: new Set<string>(), activeBranchIds: new Set([branch]) };

  it("moves entries forward a week and skips past days", () => {
    expect(copyPlanRows(lastWeek, input)).toEqual([
      { day: "2026-11-18", kind: "home", branch_id: null, place: null },
      { day: "2026-11-19", kind: "field", branch_id: null, place: "Zamalek" },
    ]);
  });

  it("keeps a day that is already planned", () => {
    const rows = copyPlanRows(lastWeek, { ...input, plannedDays: new Set(["2026-11-18"]) });
    expect(rows.map((r) => r.day)).toEqual(["2026-11-19"]);
  });

  it("skips a branch that is no longer open", () => {
    const rows = copyPlanRows(lastWeek, { ...input, today: "2026-11-01", activeBranchIds: new Set<string>() });
    expect(rows.map((r) => r.kind)).toEqual(["home", "field"]);
  });

  it("copies nothing into a week that has fully passed", () => {
    expect(copyPlanRows(lastWeek, { ...input, today: "2026-11-25" })).toEqual([]);
  });
});
