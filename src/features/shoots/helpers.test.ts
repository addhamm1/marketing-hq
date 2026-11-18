import { describe, expect, it } from "vitest";
import { DEFAULT_KIT, escapeLike, formatShootDate, missingKit, moveItem, shootMapLink, shortTime, splitShoots } from "./helpers";
import { crewAddSchema, shootRow, shootSchema } from "./schemas";

describe("splitShoots", () => {
  const rows = [
    { id: "a", shoot_on: "2026-11-20", status: "planned" as const },
    { id: "b", shoot_on: "2026-11-18", status: "confirmed" as const },
    { id: "c", shoot_on: "2026-11-17", status: "planned" as const },
    { id: "d", shoot_on: "2026-11-25", status: "cancelled" as const },
    { id: "e", shoot_on: "2026-11-18", status: "wrapped" as const },
  ];

  it("keeps today's open shoots upcoming, soonest first", () => {
    expect(splitShoots(rows, "2026-11-18").upcoming.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("puts wrapped, cancelled and earlier shoots in past, latest first", () => {
    expect(splitShoots(rows, "2026-11-18").past.map((r) => r.id)).toEqual(["d", "e", "c"]);
  });
});

describe("moveItem", () => {
  it("swaps neighbours", () => expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]));
  it("leaves the ends alone", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});

describe("missingKit", () => {
  it("offers the full kit on an empty list", () => expect(missingKit([])).toHaveLength(DEFAULT_KIT.length));
  it("skips items already listed in either language", () => {
    const names = missingKit([" camera BODY ", "عدسات"]).map((k) => k.en);
    expect(names).not.toContain("Camera body");
    expect(names).not.toContain("Lenses");
    expect(names).toHaveLength(DEFAULT_KIT.length - 2);
  });
});

describe("formatting", () => {
  it("shortens database times", () => {
    expect(shortTime("09:30:00")).toBe("09:30");
    expect(shortTime(null)).toBe("");
  });
  it("does not shift a date across time zones", () => {
    expect(formatShootDate("2027-01-01", "en")).toContain("1 January 2027");
  });
  it("prefers the shoot's own map link, then the branch point", () => {
    expect(shootMapLink("https://maps.example/x", { latitude: 1, longitude: 2 })).toBe("https://maps.example/x");
    expect(shootMapLink(null, { latitude: 30.1, longitude: 31.3 })).toContain("30.1,31.3");
    expect(shootMapLink(null, { latitude: null, longitude: null })).toBeNull();
  });
  it("escapes search wildcards", () => expect(escapeLike("50%_a\\")).toBe("50\\%\\_a\\\\"));
});

describe("shootSchema", () => {
  const base = {
    title: "Branch tour", shoot_on: "2026-12-01", call_time: "09:00", wrap_time: "", place: "branch" as const,
    branch_id: "30000000-0000-4000-8000-000000000001", location_name: "", location_url: "", status: "planned" as const,
    producer_id: null, brief: "", backup_plan: "",
  };

  it("accepts a branch shoot and its own output", () => {
    const once = shootSchema.parse(base);
    expect(shootSchema.parse(once)).toEqual(once);
  });
  it("needs a place", () => {
    expect(shootSchema.safeParse({ ...base, branch_id: null }).success).toBe(false);
    expect(shootSchema.safeParse({ ...base, place: "outside", location_name: " " }).success).toBe(false);
  });
  it("needs the wrap after the call", () => {
    const r = shootSchema.safeParse({ ...base, wrap_time: "08:00" });
    expect(r.error?.issues[0].message).toBe("shoots.errors.wrapAfterCall");
  });
  it("refuses a map link that is not http or https", () => {
    expect(shootSchema.safeParse({ ...base, location_url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("refuses a date that does not exist", () => {
    expect(shootSchema.safeParse({ ...base, shoot_on: "2027-02-31" }).success).toBe(false);
  });
  it("stores either the branch or the outside place", () => {
    const row = shootRow(shootSchema.parse({ ...base, place: "outside", location_name: "Citadel" }));
    expect(row).toMatchObject({ branch_id: null, location_name: "Citadel" });
    expect(row).not.toHaveProperty("place");
  });
});

describe("crewAddSchema", () => {
  const shoot_id = "30000000-0000-4000-8000-000000000001";
  it("needs a person of the chosen kind", () => {
    expect(crewAddSchema.safeParse({ shoot_id, kind: "member", role: "" }).success).toBe(false);
    expect(crewAddSchema.safeParse({ shoot_id, kind: "outside", role: "", external_name: "Sara" }).success).toBe(true);
  });
});
