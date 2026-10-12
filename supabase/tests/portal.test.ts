import { describe, expect, it } from "vitest";
import { as, BRAND_ESPACES, DEPT, makePipelineCard, service, U } from "./helpers";

const svc = service();

function nextMonth() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  return d.toISOString().slice(0, 10);
}

const line = (title: string) => ({
  title,
  objective: "Leads",
  vertical: "Virtual Offices",
  brand_id: BRAND_ESPACES,
  format: "carousel",
  platforms: ["instagram"],
  due_at: new Date(Date.now() + 20 * 86400000).toISOString(),
});

async function activeSteps(requestId: string) {
  const { data } = await svc
    .from("approval_steps")
    .select("id, approver_id, step_index, status")
    .eq("subject_type", "request")
    .eq("subject_id", requestId)
    .order("step_index");
  // Only the test users: the seeded Espaces staff (08_espaces_people.sql) add extra super_admin candidates.
  const testUsers = new Set<string>(Object.values(U));
  return (data ?? []).filter((s) => testUsers.has(s.approver_id));
}

async function decide(user: Parameters<typeof as>[0], stepId: string, decision: "approved" | "rejected", comment?: string) {
  return (await as(user)).rpc("decide_step", { p_step_id: stepId, p_decision: decision, p_comment: comment });
}

describe("department portal", () => {
  it("a requester submits a 3-line strategic plan; cards land in performance input", async () => {
    const sales = await as("sales");
    const { data: planId, error } = await sales.rpc("submit_strategic_plan", {
      payload: { for_month: nextMonth(), lines: [line("Line A"), line("Line B"), line("Line C")] },
    });
    expect(error).toBeNull();
    const { data: cards } = await svc.from("cards").select("stage, requesting_department_id, approver_id, reviewer_id, request_kind").eq("strategic_plan_id", planId!);
    expect(cards).toHaveLength(3);
    for (const c of cards!) {
      expect(c).toMatchObject({ stage: "performance_input", requesting_department_id: DEPT.sales, approver_id: U.approver, reviewer_id: U.leadCreative, request_kind: "strategic" });
    }
  });

  it("refuses a plan for the wrong month and from non-requesters", async () => {
    const wrong = await (await as("sales")).rpc("submit_strategic_plan", { payload: { for_month: "2020-01-01", lines: [line("x")] } });
    expect(wrong.error?.message).toContain("invalid_month");
    const member = await (await as("member")).rpc("submit_strategic_plan", { payload: { for_month: nextMonth(), lines: [line("x")] } });
    expect(member.error?.code).toBe("42501");
  });

  it("flags submissions after the 25th (Cairo time) as late", async () => {
    const c = await as("sales");
    const late = async (at: string) => (await c.rpc("strategic_is_late", { p_for_month: "2026-11-01", p_at: at })).data;
    expect(await late("2026-10-25T20:00:00Z")).toBe(false); // 23:00 on the 25th in Cairo
    expect(await late("2026-10-25T21:30:00Z")).toBe(true); // 00:30 on the 26th in Cairo
    expect(await late("2026-10-02T09:00:00Z")).toBe(false);
  });

  it("urgent requests need a reason and every field, then notify traffic", async () => {
    const sales = await as("sales");
    const noReason = await sales.rpc("submit_urgent_request", { payload: line("Urgent reel") });
    expect(noReason.error?.message).toContain("urgent_reason");
    const partial = await sales.rpc("submit_urgent_request", { payload: { title: "x", urgent_reason: "now" } });
    expect(partial.error?.message).toContain("missing_fields");
    const { data: id, error } = await sales.rpc("submit_urgent_request", { payload: { ...line("Urgent reel"), urgent_reason: "Event tomorrow" } });
    expect(error).toBeNull();
    const { data: n } = await svc.from("notifications").select("id").eq("user_id", U.traffic).eq("kind", "urgent_submitted").contains("data", { card_id: id! });
    expect(n?.length).toBe(1);
  });

  it("return and resubmit loop", async () => {
    const card = await makePipelineCard("intake");
    const traffic = await as("traffic");
    expect((await traffic.rpc("move_card_stage", { p_card_id: card.id, p_to: "request", p_payload: { returned_reason: "Need copy", missing_items: ["copy"] } })).error).toBeNull();
    const hr = await as("hr");
    expect((await hr.rpc("resubmit_request", { p_card_id: card.id, payload: {} })).error?.code).toBe("42501");
    const approver = await as("approver"); // same department as the requester
    expect((await approver.rpc("resubmit_request", { p_card_id: card.id, payload: { key_message: "Updated" } })).error).toBeNull();
    const { data } = await svc.from("cards").select("stage, missing_items, returned_reason, key_message").eq("id", card.id).single();
    expect(data).toMatchObject({ stage: "performance_input", missing_items: [], returned_reason: null, key_message: "Updated" });
  });
});

describe("approval engine", () => {
  it("annual leave goes team lead, super_admin, hr and deducts the balance", async () => {
    const before = await svc.from("leave_balances").select("used, type_id, request_types!inner(key)").eq("user_id", U.member2).eq("year", 2027).eq("request_types.key", "annual_leave").single();
    const { data: id, error } = await (await as("member2")).rpc("submit_request", { type_key: "annual_leave", data: { starts_on: "2027-02-14", ends_on: "2027-02-15" } });
    expect(error).toBeNull();
    let steps = await activeSteps(id!);
    expect(steps.map((s) => [s.approver_id, s.status])).toEqual([[U.leadCreative, "active"], [U.admin, "waiting"], [U.hr, "waiting"]]);
    expect((await decide("leadCreative", steps[0].id, "approved")).error).toBeNull();
    steps = await activeSteps(id!);
    expect((await decide("admin", steps[1].id, "approved")).error).toBeNull();
    expect((await decide("hr", steps[2].id, "approved")).error).toBeNull();
    const { data: req } = await svc.from("requests").select("status, days").eq("id", id!).single();
    expect(req).toMatchObject({ status: "approved", days: 2 });
    const after = await svc.from("leave_balances").select("used").eq("user_id", U.member2).eq("year", 2027).eq("type_id", before.data!.type_id).single();
    expect(Number(after.data!.used)).toBe(Number(before.data!.used) + 2);
  });

  it("a team lead's own leave skips them (no self-approval) and merges the same approver", async () => {
    const { data: id } = await (await as("leadCreative")).rpc("submit_request", { type_key: "annual_leave", data: { starts_on: "2027-03-07", ends_on: "2027-03-07" } });
    const steps = await activeSteps(id!);
    expect(steps.map((s) => [s.approver_id, s.status])).toEqual([[U.admin, "active"], [U.admin, "skipped"], [U.hr, "waiting"]]);
  });

  it("multi-candidate steps: the first decision wins and siblings are skipped", async () => {
    await svc.from("user_roles").insert({ user_id: U.leadership, role: "hr" });
    try {
      const { data: id } = await (await as("member")).rpc("submit_request", { type_key: "casual_leave", data: { starts_on: "2027-03-14", ends_on: "2027-03-14" } });
      let steps = await activeSteps(id!);
      await decide("leadCreative", steps[0].id, "approved");
      steps = await activeSteps(id!);
      const hrSteps = steps.filter((s) => s.step_index === 1);
      expect(hrSteps.map((s) => s.status)).toEqual(["active", "active"]);
      const leadershipStep = hrSteps.find((s) => s.approver_id === U.leadership)!;
      expect((await decide("leadership", leadershipStep.id, "approved")).error).toBeNull();
      steps = await activeSteps(id!);
      expect(steps.find((s) => s.approver_id === U.hr)?.status).toBe("skipped");
      expect((await svc.from("requests").select("status").eq("id", id!).single()).data?.status).toBe("approved");
    } finally {
      await svc.from("user_roles").delete().eq("user_id", U.leadership).eq("role", "hr");
    }
  });

  it("refuses requests above the balance", async () => {
    const { error } = await (await as("member")).rpc("submit_request", { type_key: "annual_leave", data: { starts_on: "2027-06-01", ends_on: "2027-07-31" } });
    expect(error?.message).toContain("insufficient_balance");
  });

  it("reject needs a comment and ends the request", async () => {
    const { data: id } = await (await as("member")).rpc("submit_request", { type_key: "work_from_home", data: { starts_on: "2027-04-04", ends_on: "2027-04-04" } });
    const [step] = await activeSteps(id!);
    expect((await decide("leadCreative", step.id, "rejected")).error?.message).toContain("comment");
    expect((await decide("leadCreative", step.id, "rejected", "Team day")).error).toBeNull();
    expect((await svc.from("requests").select("status").eq("id", id!).single()).data?.status).toBe("rejected");
  });

  it("cancel: requester while pending; hr refunds approved leave", async () => {
    const member = await as("member");
    const { data: pendingId } = await member.rpc("submit_request", { type_key: "casual_leave", data: { starts_on: "2027-05-09", ends_on: "2027-05-09" } });
    expect((await member.rpc("cancel_request", { p_request_id: pendingId! })).error).toBeNull();
    expect((await svc.from("requests").select("status").eq("id", pendingId!).single()).data?.status).toBe("cancelled");

    const { data: id } = await member.rpc("submit_request", { type_key: "casual_leave", data: { starts_on: "2027-05-10", ends_on: "2027-05-10" } });
    let steps = await activeSteps(id!);
    await decide("leadCreative", steps[0].id, "approved");
    steps = await activeSteps(id!);
    await decide("hr", steps[1].id, "approved");
    const typeId = (await svc.from("requests").select("type_id").eq("id", id!).single()).data!.type_id;
    const used = async () => Number((await svc.from("leave_balances").select("used").eq("user_id", U.member).eq("type_id", typeId).eq("year", 2027).single()).data!.used);
    const usedBefore = await used();
    expect((await member.rpc("cancel_request", { p_request_id: id! })).error?.code).toBe("42501");
    expect((await (await as("hr")).rpc("cancel_request", { p_request_id: id! })).error).toBeNull();
    expect(await used()).toBe(usedBefore - 1);
  });

  it("escalation: a requester cannot change a request's status", async () => {
    const member = await as("member");
    const { data: id } = await member.rpc("submit_request", { type_key: "equipment", data: { item: "Mouse", reason: "Broken" } });
    const { error } = await member.from("requests").update({ status: "approved" } as never).eq("id", id!);
    expect(error).not.toBeNull();
  });

  it("requests are visible to the requester, their team lead and hr only", async () => {
    const { data: id } = await (await as("member")).rpc("submit_request", { type_key: "permission", data: { starts_on: "2027-04-11", kind: "late_arrival", hours: 1 } });
    const sees = async (u: Parameters<typeof as>[0]) => ((await (await as(u)).from("requests").select("id").eq("id", id!)).data ?? []).length;
    expect(await sees("member")).toBe(1);
    expect(await sees("leadCreative")).toBe(1);
    expect(await sees("hr")).toBe(1);
    expect(await sees("member2")).toBe(0);
    expect(await sees("traffic")).toBe(0);
  });

  it("counts working days skipping Fridays and holidays", async () => {
    const c = await as("member");
    expect((await c.rpc("working_days", { p_from: "2026-10-15", p_to: "2026-10-18" })).data).toBe(3);
    expect((await c.rpc("working_days", { p_from: "2026-10-05", p_to: "2026-10-07" })).data).toBe(2);
  });
});

describe("cron functions", () => {
  it("due-soon notifies once per due date", async () => {
    const card = await makePipelineCard("production", { due_at: new Date(Date.now() + 2 * 3600_000).toISOString() });
    await svc.from("card_assignees").insert({ card_id: card.id, user_id: U.member, role: "design" });
    await svc.rpc("cron_due_soon");
    await svc.rpc("cron_due_soon");
    const { data } = await svc.from("notifications").select("id").eq("user_id", U.member).eq("kind", "card_due_soon").contains("data", { card_id: card.id });
    expect(data?.length).toBe(1);
  });

  it("daily moves cards published a week ago to reported", async () => {
    const card = await makePipelineCard("published", { published_at: new Date(Date.now() - 8 * 86400000).toISOString() });
    await svc.rpc("cron_daily");
    await svc.rpc("cron_daily");
    expect((await svc.from("cards").select("stage").eq("id", card.id).single()).data?.stage).toBe("reported");
    const { data: events } = await svc.from("card_events").select("id").eq("card_id", card.id).eq("kind", "stage_change");
    expect(events?.length).toBe(1);
  });

  it("authenticated users cannot run cron functions", async () => {
    expect((await (await as("admin")).rpc("cron_daily")).error).not.toBeNull();
  });
});
