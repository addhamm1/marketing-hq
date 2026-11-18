import { afterAll, describe, expect, it } from "vitest";
import { as, BRANCH_HQ, DEPT, service, U } from "./helpers";

// W-14: the team week read and the week plan. Dates are far ahead so nothing here meets real plans.
const svc = service();
const SATURDAY = "2031-03-01";
const THURSDAY = "2031-03-06";
const day = (n: number) => `2031-03-0${n}`;
const COORDINATE = /lat|lng|lon|accuracy|distance|geo/i;

const week = (user: Parameters<typeof as>[0], department?: string) =>
  as(user).then((c) => c.rpc("team_week", { p_from: SATURDAY, p_to: THURSDAY, ...(department ? { p_department_id: department } : {}) }));

const createdRequests: string[] = [];

afterAll(async () => {
  await svc.from("week_plan_entries").delete().gte("day", SATURDAY).lte("day", THURSDAY);
  if (createdRequests.length) await svc.from("requests").delete().in("id", createdRequests);
});

describe("team_week", () => {
  it("returns rows to a requester and a member", async () => {
    for (const user of ["sales", "member"] as const) {
      const { data, error } = await week(user, DEPT.marketing);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      expect(data!.some((r) => r.user_id === U.member)).toBe(true);
    }
  });

  it("returns six days for each person", async () => {
    const { data } = await week("member", DEPT.marketing);
    expect(data!.filter((r) => r.user_id === U.member).map((r) => r.day)).toEqual([day(1), day(2), day(3), day(4), day(5), day(6)]);
  });

  it("returns nothing to guests, inactive users and users with no role", async () => {
    for (const user of ["guest", "inactive", "norole"] as const) {
      const { data, error } = await week(user);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("leaves out guests and people who are inactive", async () => {
    const { data } = await week("admin");
    const ids = new Set(data!.map((r) => r.user_id));
    expect(ids.has(U.guest)).toBe(false);
    expect(ids.has(U.inactive)).toBe(false);
    expect(ids.has(U.norole)).toBe(false);
  });

  it("carries no coordinate fields", async () => {
    const { data } = await week("member", DEPT.marketing);
    expect(Object.keys(data![0]).filter((key) => COORDINATE.test(key))).toEqual([]);
  });

  it("shows an approved leave only as away", async () => {
    const { data: type } = await svc.from("request_types").select("id").eq("is_leave", true).limit(1).single();
    const { data: request, error } = await svc
      .from("requests")
      .insert({
        type_id: type!.id,
        requester_id: U.member2,
        status: "approved",
        starts_on: day(3),
        ends_on: day(3),
        days: 1,
        data: { reason: "PRIVATE-LEAVE-REASON" },
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    createdRequests.push(request!.id);

    const { data } = await week("sales", DEPT.marketing);
    const cell = data!.find((r) => r.user_id === U.member2 && r.day === day(3))!;
    expect(cell.kind).toBe("away");
    expect(cell.place).toBeNull();
    expect(cell.branch_id).toBeNull();
    expect(JSON.stringify(data)).not.toContain("PRIVATE-LEAVE-REASON");
  });

  it("puts a person's plan on the board", async () => {
    const member = await as("member");
    await member.from("week_plan_entries").upsert({ user_id: U.member, day: day(4), kind: "field", place: "Zamalek" }, { onConflict: "user_id,day" });
    const { data } = await week("sales", DEPT.marketing);
    const cell = data!.find((r) => r.user_id === U.member && r.day === day(4))!;
    expect(cell.kind).toBe("field");
    expect(cell.place).toBe("Zamalek");
  });
});

describe("week_plan_entries", () => {
  it("lets a member write their own plan", async () => {
    const member = await as("member");
    const { error } = await member.from("week_plan_entries").insert({ user_id: U.member, day: day(1), kind: "home" });
    expect(error).toBeNull();
  });

  it("stops a member writing another person's plan", async () => {
    const member = await as("member");
    const { error } = await member.from("week_plan_entries").insert({ user_id: U.member2, day: day(1), kind: "home" });
    expect(error?.code).toBe("42501");
  });

  it("stops a member changing or clearing another person's plan", async () => {
    await svc.from("week_plan_entries").insert({ user_id: U.community, day: day(2), kind: "away" });
    const member = await as("member");
    const changed = await member.from("week_plan_entries").update({ kind: "home" }).eq("user_id", U.community).eq("day", day(2)).select("id");
    expect(changed.data).toEqual([]);
    const removed = await member.from("week_plan_entries").delete().eq("user_id", U.community).eq("day", day(2)).select("id");
    expect(removed.data).toEqual([]);
    const { data } = await svc.from("week_plan_entries").select("kind").eq("user_id", U.community).eq("day", day(2)).single();
    expect(data!.kind).toBe("away");
  });

  it("hides other people's plans from a member", async () => {
    const member = await as("member");
    const { data } = await member.from("week_plan_entries").select("user_id").eq("user_id", U.community);
    expect(data).toEqual([]);
  });

  it("lets a traffic manager write anyone's plan", async () => {
    const traffic = await as("traffic");
    const { error } = await traffic.from("week_plan_entries").insert({ user_id: U.member2, day: day(5), kind: "branch", branch_id: BRANCH_HQ });
    expect(error).toBeNull();
  });

  it("lets a super admin clear anyone's plan", async () => {
    await svc.from("week_plan_entries").insert({ user_id: U.leadPerformance, day: day(5), kind: "home" });
    const admin = await as("admin");
    const { data } = await admin.from("week_plan_entries").delete().eq("user_id", U.leadPerformance).eq("day", day(5)).select("id");
    expect(data).toHaveLength(1);
  });

  it("lets a requester write their own plan", async () => {
    const sales = await as("sales");
    const { error } = await sales.from("week_plan_entries").insert({ user_id: U.sales, day: day(1), kind: "field", place: "Client office" });
    expect(error).toBeNull();
  });

  it("stops a requester writing a colleague's plan", async () => {
    const sales = await as("sales");
    const { error } = await sales.from("week_plan_entries").insert({ user_id: U.approver, day: day(1), kind: "home" });
    expect(error?.code).toBe("42501");
  });

  it("refuses guests, inactive users and users with no role", async () => {
    for (const [user, id] of [["guest", U.guest], ["inactive", U.inactive], ["norole", U.norole]] as const) {
      const client = await as(user);
      const { error } = await client.from("week_plan_entries").insert({ user_id: id, day: day(6), kind: "home" });
      expect(error?.code, user).toBe("42501");
    }
  });

  it("requires a branch when the plan says branch", async () => {
    const member = await as("member");
    const { error } = await member.from("week_plan_entries").insert({ user_id: U.member, day: day(6), kind: "branch" });
    expect(error?.code).toBe("23514");
  });
});
