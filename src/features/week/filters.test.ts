import { describe, expect, it } from "vitest";
import { parseWeekFilters, weekHref } from "./filters";

const context = {
  today: "2026-11-18",
  marketingId: "mkt",
  departmentIds: ["mkt", "sales"],
  teams: [
    { id: "creative", department_id: "mkt" },
    { id: "field-sales", department_id: "sales" },
  ],
};

describe("week filters", () => {
  it("defaults to this week and marketing", () => {
    expect(parseWeekFilters({}, context)).toEqual({ week: "2026-11-14", departmentId: "mkt", teamId: null });
  });

  it("snaps any date to its Saturday and ignores nonsense", () => {
    expect(parseWeekFilters({ week: "2026-11-25" }, context).week).toBe("2026-11-21");
    expect(parseWeekFilters({ week: "soon" }, context).week).toBe("2026-11-14");
  });

  it("accepts every department, or a known one", () => {
    expect(parseWeekFilters({ department: "all" }, context).departmentId).toBeNull();
    expect(parseWeekFilters({ department: "sales" }, context).departmentId).toBe("sales");
    expect(parseWeekFilters({ department: "other" }, context).departmentId).toBe("mkt");
  });

  it("drops a team from another department", () => {
    expect(parseWeekFilters({ team: "creative" }, context).teamId).toBe("creative");
    expect(parseWeekFilters({ department: "sales", team: "creative" }, context).teamId).toBeNull();
  });

  it("keeps the default department out of the link", () => {
    const link = (departmentId: string | null) => weekHref("/week", { week: "2026-11-14", departmentId, teamId: null }, "mkt");
    expect(link("mkt")).toBe("/week?week=2026-11-14");
    expect(link("sales")).toBe("/week?week=2026-11-14&department=sales");
    expect(link(null)).toBe("/week?week=2026-11-14&department=all");
  });
});
