import { afterAll, describe, expect, it } from "vitest";
import { anon, as, BRANCH_HQ, DEPT, service, TEAM, U, visibleIds } from "./helpers";

const ACTIVE = ["admin", "leadership", "traffic", "leadCreative", "member", "sales", "approver", "hr", "guest"] as const;

describe("organisation tables", () => {
  it.each(ACTIVE)("%s reads departments, teams, branches and settings", async (user) => {
    const c = await as(user);
    expect((await visibleIds(c, "departments")).length).toBe(9);
    expect((await visibleIds(c, "teams")).length).toBe(4);
    expect((await visibleIds(c, "branches")).length).toBeGreaterThanOrEqual(18);
    expect((await visibleIds(c, "settings", "key")).length).toBeGreaterThan(5);
  });

  it("an inactive user reads none of them", async () => {
    const c = await as("inactive");
    expect(await visibleIds(c, "departments")).toEqual([]);
    expect(await visibleIds(c, "branches")).toEqual([]);
    expect(await visibleIds(c, "settings", "key")).toEqual([]);
  });

  it("anonymous visitors read nothing", async () => {
    const { data, error } = await anon().from("branches").select("id");
    expect(error ?? data?.length === 0).toBeTruthy();
  });

  it("only super_admin writes branches", async () => {
    const member = await as("member");
    const { data } = await member.from("branches").update({ area: "x" }).eq("id", BRANCH_HQ).select("id");
    expect(data ?? []).toEqual([]);
    const admin = await as("admin");
    const { data: ok } = await admin.from("branches").update({ area: "Heliopolis" }).eq("id", BRANCH_HQ).select("id");
    expect(ok?.length).toBe(1);
  });
});

describe("branch locations", () => {
  it.each(["admin", "member", "hr"] as const)("%s reads branch coordinates", async (user) => {
    const { data } = await (await as(user)).from("branches").select("latitude, longitude, geofence_radius_m").eq("slug", "hq").single();
    expect(data?.latitude).not.toBeNull();
    expect(data?.geofence_radius_m).toBe(150);
  });

  it("only super_admin changes the geofence", async () => {
    const member = await as("member");
    const { data: none } = await member.from("branches").update({ geofence_radius_m: 999 }).eq("slug", "hq").select("id");
    expect(none ?? []).toEqual([]);
    const admin = await as("admin");
    const { data: one } = await admin.from("branches").update({ geofence_radius_m: 150 }).eq("slug", "hq").select("id");
    expect(one).toHaveLength(1);
  });

  it("refuses the retired QR method and out-of-range coordinates", async () => {
    const admin = await as("admin");
    expect((await admin.from("branches").update({ checkin_methods: ["qr"] }).eq("slug", "hq")).error).not.toBeNull();
    expect((await admin.from("branches").update({ latitude: 95 }).eq("slug", "hq")).error).not.toBeNull();
  });
});

describe("profiles", () => {
  it.each(["admin", "leadership", "traffic", "member", "hr"] as const)("%s reads every profile", async (user) => {
    const ids = await visibleIds(await as(user), "profiles");
    expect(ids.length).toBeGreaterThanOrEqual(15);
  });

  it.each(["sales", "approver", "guest", "inactive", "norole"] as const)("%s reads only their own profile", async (user) => {
    expect(await visibleIds(await as(user), "profiles")).toEqual([U[user]]);
  });

  it("requesters see colleagues only through public_profiles()", async () => {
    const c = await as("sales");
    const { data, error } = await c.rpc("public_profiles");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(5);
    expect(Object.keys(data![0]).sort()).toEqual(["department_id", "display_name", "id", "team_id", "title"]);
  });

  it("a user updates their own allowed columns", async () => {
    const c = await as("member");
    const { data, error } = await c.from("profiles").update({ display_name: "Mona" }).eq("id", U.member).select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it.each([
    ["status", "inactive"],
    ["department_id", DEPT.sales],
    ["team_id", TEAM.traffic],
    ["must_change_password", true],
    ["email", "x@test.local"],
    ["full_name", "Someone Else"],
  ] as const)("escalation: a user cannot set their own %s", async (column, value) => {
    const c = await as("member");
    const { error } = await c.from("profiles").update({ [column]: value } as never).eq("id", U.member);
    expect(error?.code).toBe("42501");
  });

  it("a user cannot update someone else's profile", async () => {
    const c = await as("member");
    const { data } = await c.from("profiles").update({ display_name: "hacked" }).eq("id", U.member2).select("id");
    expect(data ?? []).toEqual([]);
  });
});

describe("user_roles", () => {
  it("members read roles, requesters read only their own", async () => {
    expect((await visibleIds(await as("member"), "user_roles")).length).toBeGreaterThan(10);
    const { data } = await (await as("sales")).from("user_roles").select("user_id");
    expect(new Set(data!.map((r) => r.user_id))).toEqual(new Set([U.sales]));
  });

  it("escalation: a user cannot grant themselves a role", async () => {
    const c = await as("member");
    const { error } = await c.from("user_roles").insert({ user_id: U.member, role: "super_admin" });
    expect(error).not.toBeNull();
  });
});

describe("admin functions", () => {
  it.each(["member", "hr", "leadership", "traffic"] as const)("%s cannot call admin_set_roles", async (user) => {
    const { error } = await (await as(user)).rpc("admin_set_roles", { p_user_id: user === "member" ? U.member : U.member2, roles: [{ role: "super_admin" }] });
    expect(error?.code).toBe("42501");
  });

  it.each(["member", "leadership", "sales"] as const)("%s cannot call admin_update_profile or require_password_change", async (user) => {
    const c = await as(user);
    const a = await c.rpc("admin_update_profile", { p_user_id: U.member2, patch: { status: "inactive" } });
    expect(a.error?.code).toBe("42501");
    const b = await c.rpc("require_password_change", { p_user_id: U.member2 });
    expect(b.error?.code).toBe("42501");
  });

  it("hr may change schedules but not profile fields", async () => {
    const c = await as("hr");
    const ok = await c.rpc("admin_update_profile", { p_user_id: U.member2, patch: { start_time: "09:30" } });
    expect(ok.error).toBeNull();
    const bad = await c.rpc("admin_update_profile", { p_user_id: U.member2, patch: { team_id: TEAM.traffic } });
    expect(bad.error?.code).toBe("42501");
    await c.rpc("admin_update_profile", { p_user_id: U.member2, patch: { start_time: "10:00" } });
  });

  it("authenticated users cannot revoke sessions (service role only)", async () => {
    const { error } = await (await as("admin")).rpc("admin_revoke_sessions", { p_user_id: U.member2 });
    expect(error).not.toBeNull();
  });

  it("super_admin cannot remove their own super_admin role", async () => {
    const { error } = await (await as("admin")).rpc("admin_set_roles", { p_user_id: U.admin, roles: [{ role: "member" }] });
    expect(error?.code).toBe("42501");
  });

  it("role and status changes are written to audit_log", async () => {
    const admin = await as("admin");
    await admin.rpc("admin_set_roles", { p_user_id: U.community, roles: [{ role: "member" }] });
    const { data } = await admin
      .from("audit_log")
      .select("table_name, actor_id")
      .eq("table_name", "user_roles")
      .eq("actor_id", U.admin)
      .limit(1);
    expect(data?.length).toBe(1);
  });
});

describe("audit_log", () => {
  it("only super_admin reads it", async () => {
    expect(await visibleIds(await as("member"), "audit_log")).toEqual([]);
    expect(await visibleIds(await as("hr"), "audit_log")).toEqual([]);
  });
  it("nobody writes it directly", async () => {
    const { error } = await (await as("admin")).from("audit_log").insert({ table_name: "x", action: "insert" });
    expect(error).not.toBeNull();
  });
});

describe("schedules", () => {
  it("a team lead reads their team's schedules, a member only their own", async () => {
    const lead = await visibleIds(await as("leadCreative"), "schedules", "user_id");
    expect(lead).toEqual(expect.arrayContaining([U.member, U.member2, U.leadCreative]));
    expect(lead).not.toContain(U.traffic);
    expect(await visibleIds(await as("member"), "schedules", "user_id")).toEqual([U.member]);
  });
});

describe("settings", () => {
  const svc = service();
  afterAll(async () => {
    await svc.from("settings").update({ value: 15 }).eq("key", "lateness_grace_minutes");
  });

  it("hr edits only lateness_grace_minutes", async () => {
    const hr = await as("hr");
    const ok = await hr.from("settings").update({ value: 20 }).eq("key", "lateness_grace_minutes").select("key");
    expect(ok.data?.length).toBe(1);
    const no = await hr.from("settings").update({ value: 9 }).eq("key", "wip_limit").select("key");
    expect(no.data ?? []).toEqual([]);
  });

  it("members cannot edit settings", async () => {
    const no = await (await as("member")).from("settings").update({ value: 1 }).eq("key", "wip_limit").select("key");
    expect(no.data ?? []).toEqual([]);
  });
});

describe("my_access", () => {
  it("reports guards for each kind of user", async () => {
    const pick = async (u: Parameters<typeof as>[0]) =>
      (await (await as(u)).rpc("my_access")).data as { is_team_app: boolean; is_portal: boolean; is_marketing: boolean };
    expect(await pick("member")).toMatchObject({ is_team_app: true, is_portal: false, is_marketing: true });
    expect(await pick("sales")).toMatchObject({ is_team_app: false, is_portal: true, is_marketing: false });
    expect(await pick("hr")).toMatchObject({ is_team_app: true, is_portal: true, is_marketing: false });
    expect(await pick("leadership")).toMatchObject({ is_team_app: true, is_marketing: true });
    expect(await pick("guest")).toMatchObject({ is_team_app: true, is_marketing: false });
    expect(await pick("norole")).toMatchObject({ is_team_app: false, is_portal: false, is_marketing: false });
  });
});
