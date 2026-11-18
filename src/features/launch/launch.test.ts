import { describe, expect, it } from "vitest";
import { allowanceChanges, planAllowance } from "./allowance-plan";
import { birthdayFields, daysInMonth, isRealDate, isValidBirthday, myBirthdaySchema } from "./birthday";
import { computeChecks, isMissing, isStaffMember, type LaunchData, type StaffRow } from "./checks";
import { expectedHolidays, missingHolidays, oneYearAfter } from "./holidays";
import { seasonSchema, slugify } from "./schemas";

describe("birthdays", () => {
  it("knows the length of each month and allows 29 February", () => {
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(4)).toBe(30);
    expect(isValidBirthday(2, 29)).toBe(true);
  });
  it("refuses dates that do not exist", () => {
    expect(isValidBirthday(2, 31)).toBe(false);
    expect(isValidBirthday(4, 31)).toBe(false);
    expect(isValidBirthday(13, 1)).toBe(false);
  });
  it("the form refuses 31 February beside the day field", () => {
    const r = myBirthdaySchema.safeParse({ birth_month: 2, birth_day: 31, celebrate: true });
    expect(r.error?.issues[0]).toMatchObject({ path: ["birth_day"], message: "launch.birthday.invalid" });
  });
  it("needs both parts, or neither", () => {
    expect(myBirthdaySchema.safeParse({ birth_month: 5, birth_day: null, celebrate: true }).success).toBe(false);
    expect(myBirthdaySchema.safeParse({ birth_month: "none", birth_day: "", celebrate: false }).success).toBe(true);
  });
  it("accepts its own output", () => {
    const once = myBirthdaySchema.parse({ birth_month: "3", birth_day: "9", celebrate: true });
    expect(myBirthdaySchema.parse(once)).toEqual({ birth_month: 3, birth_day: 9, celebrate: true });
  });
  it("has no year field", () => expect(Object.keys(birthdayFields)).toEqual(["birth_month", "birth_day"]));
  it("checks calendar dates", () => {
    expect(isRealDate("2026-02-28")).toBe(true);
    expect(isRealDate("2026-02-30")).toBe(false);
  });
});

describe("holidays", () => {
  it("lists fixed and movable days inside a window", () => {
    const days = expectedHolidays("2027-01-01", "2027-03-31");
    expect(days).toEqual(["2027-01-07", "2027-01-25", "2027-03-10", "2027-03-11", "2027-03-12"]);
  });
  it("repeats fixed days in later years", () => expect(expectedHolidays("2029-10-01", "2029-10-31")).toEqual(["2029-10-06"]));
  it("reports what is missing", () => {
    expect(missingHolidays(["2027-01-07", "2027-01-25"], ["2027-01-07"])).toEqual(["2027-01-25"]);
  });
  it("accepts a moon-dependent date moved by a day or two", () => {
    expect(missingHolidays(["2027-06-06"], ["2027-06-07"])).toEqual([]);
  });
  it("counts each listed day once", () => {
    // Labour Day on 1 May must not also stand in for Sham El Nessim on 3 May.
    expect(missingHolidays(["2027-05-01", "2027-05-03"], ["2027-05-01"])).toEqual(["2027-05-03"]);
  });
  it("adds a year", () => expect(oneYearAfter("2026-11-18")).toBe("2027-11-18"));
});

describe("allowance plan", () => {
  it("fills people with nothing and keeps custom allowances by default", () => {
    expect(planAllowance([0, 0, 21, 30], 21, false)).toEqual({ unset: 2, custom: 1, changing: 2 });
  });
  it("replaces custom allowances when asked", () => {
    expect(planAllowance([0, 21, 30], 21, true)).toEqual({ unset: 1, custom: 1, changing: 2 });
  });
  it("agrees person by person", () => {
    expect(allowanceChanges(0, 21, false)).toBe(true);
    expect(allowanceChanges(30, 21, false)).toBe(false);
    expect(allowanceChanges(30, 21, true)).toBe(true);
    expect(allowanceChanges(21, 21, true)).toBe(false);
  });
});

describe("season schema", () => {
  const base = { name_en: "Ramadan", name_ar: "رمضان", starts_on: "2028-01-28", ends_on: "2028-02-26", items: "ramadan-lantern, ramadan-taqiyah", is_active: true };
  it("splits item ids", () => expect(seasonSchema.parse(base).items).toEqual(["ramadan-lantern", "ramadan-taqiyah"]));
  it("accepts its own output", () => {
    const once = seasonSchema.parse(base);
    expect(seasonSchema.parse(once)).toEqual(once);
  });
  it("refuses an end before the start", () => expect(seasonSchema.safeParse({ ...base, ends_on: "2028-01-01" }).success).toBe(false));
  it("refuses a malformed item id", () => expect(seasonSchema.safeParse({ ...base, items: "Bad Item" }).success).toBe(false));
  it("makes keys from names", () => expect(slugify("Eid al-Fitr!")).toBe("eid-al-fitr"));
});

describe("launch checks", () => {
  const person = (over: Partial<StaffRow> = {}): StaffRow & { id: string } => ({
    id: "p1", status: "active", roles: ["member"], birth_month: 3, joined_on: "2024-01-01", phone: "010", home_branch_id: "b1", celebrate: true, ...over,
  });
  const ready: LaunchData = {
    today: "2026-11-18",
    branches: [{ id: "b1", is_active: true, location_confirmed_at: "2026-11-01T00:00:00Z" }],
    staff: [person()],
    annualAllowances: [{ user_id: "p1", allowance: 21 }],
    hrHolders: 1,
    rooms: [{ branch_id: "b1", is_active: true }],
    holidays: expectedHolidays("2026-11-18", "2027-11-18"),
    gateTemplates: [{ owner_id: "p1", is_active: true, track_active: true }],
    emailConfigured: true,
    pushConfigured: true,
  };
  const by = (d: LaunchData, id: string) => computeChecks(d).find((r) => r.id === id)!;

  it("is all ready when everything is in place", () => {
    expect(computeChecks(ready).every((r) => r.status === "ready" && r.count === 0)).toBe(true);
  });
  it("guests and inactive people are not staff", () => {
    expect(isStaffMember(person({ roles: ["guest"] }))).toBe(false);
    expect(isStaffMember(person({ status: "inactive" }))).toBe(false);
    expect(isStaffMember(person({ roles: [] }))).toBe(false);
  });
  it("does not chase a birthday from someone who opted out", () => {
    expect(isMissing(person({ birth_month: null, celebrate: false }), "birthday")).toBe(false);
    expect(isMissing(person({ birth_month: null }), "birthday")).toBe(true);
  });
  it("counts inactive branches out", () => {
    const d = { ...ready, branches: [...ready.branches, { id: "b2", is_active: false, location_confirmed_at: null }] };
    expect(by(d, "branches").count).toBe(0);
    expect(by(d, "rooms").count).toBe(0);
  });
  it("blocks launch without an hr holder or leave allowances", () => {
    expect(by({ ...ready, hrHolders: 0 }, "hr")).toMatchObject({ count: 1, status: "blocked" });
    expect(by({ ...ready, annualAllowances: [{ user_id: "p1", allowance: 0 }] }, "leave")).toMatchObject({ count: 1, status: "blocked" });
  });
  it("asks for a review of softer gaps", () => {
    expect(by({ ...ready, pushConfigured: false }, "push")).toMatchObject({ count: 1, status: "review" });
    expect(by({ ...ready, holidays: [] }, "holidays").status).toBe("review");
  });
  it("skips gate templates that are switched off", () => {
    const d = { ...ready, gateTemplates: [{ owner_id: null, is_active: false, track_active: true }, { owner_id: null, is_active: true, track_active: false }] };
    expect(by(d, "gates").count).toBe(0);
  });
});
