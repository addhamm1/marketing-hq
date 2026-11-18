import { describe, expect, it } from "vitest";
import { toWeekPeople, type TeamWeekRow } from "./people";

const row = (over: Partial<TeamWeekRow>): TeamWeekRow => ({
  user_id: "ali",
  display_name: "Ali",
  title: "Designer",
  department_id: "d",
  team_id: "t",
  day: "2026-11-18",
  kind: "branch",
  branch_id: null,
  place: null,
  source: "default",
  ...over,
});

const viewer = { userId: "me", canEditAnyone: false };

describe("toWeekPeople", () => {
  it("groups a person's days into one row", () => {
    const people = toWeekPeople([row({}), row({ day: "2026-11-19", kind: "home" })], viewer);
    expect(people).toHaveLength(1);
    expect(Object.keys(people[0].days)).toEqual(["2026-11-18", "2026-11-19"]);
  });

  it("never passes on the source of a day", () => {
    const [person] = toWeekPeople([row({ kind: "away", source: "leave" })], viewer);
    const cell = person.days["2026-11-18"];
    expect(cell).toEqual({ kind: "away", branchId: null, place: null, planned: false, locked: false });
    expect(JSON.stringify(person)).not.toContain("leave");
  });

  it("drops a place on kinds that must not show one", () => {
    const [person] = toWeekPeople([row({ kind: "away", place: "Sharm", source: "plan" })], viewer);
    expect(person.days["2026-11-18"].place).toBeNull();
  });

  it("keeps the place on field days and shoots", () => {
    const [person] = toWeekPeople([row({ kind: "field", place: "Zamalek" })], viewer);
    expect(person.days["2026-11-18"].place).toBe("Zamalek");
  });

  it("shows a shoot at a branch under the branch's local name", () => {
    const branches = [{ id: "b", name_en: "Maadi", name: "المعادي" }];
    const [person] = toWeekPeople([row({ kind: "shoot", branch_id: "b", place: "Maadi", source: "shoot" })], viewer, branches);
    expect(person.days["2026-11-18"].place).toBe("المعادي");
  });

  it("marks plans and locked days only on rows the viewer can edit", () => {
    const mine = toWeekPeople([row({ user_id: "me", kind: "home", source: "plan" })], viewer)[0];
    expect(mine.isMe).toBe(true);
    expect(mine.days["2026-11-18"].planned).toBe(true);

    const locked = toWeekPeople([row({ user_id: "me", kind: "away", source: "leave" })], viewer)[0];
    expect(locked.days["2026-11-18"].locked).toBe(true);

    const other = toWeekPeople([row({ kind: "away", source: "leave" })], viewer)[0];
    expect(other.canEdit).toBe(false);
    expect(other.days["2026-11-18"].locked).toBe(false);
  });

  it("treats an unexpected kind as unknown", () => {
    const [person] = toWeekPeople([row({ kind: "elsewhere" })], viewer);
    expect(person.days["2026-11-18"].kind).toBe("unknown");
  });
});
