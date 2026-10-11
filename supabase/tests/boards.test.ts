import { describe, expect, it } from "vitest";
import {
  activeStep, as, assign, cardStage, DEPT, makePipelineCard, PIPELINE, service, SPRINT, U, visibleIds,
} from "./helpers";

describe("boards and lists", () => {
  it("a marketing member creates a board and gets it back", async () => {
    const c = await as("member");
    const { data, error } = await c
      .from("boards")
      .insert({ workspace_id: "50000000-0000-4000-8000-000000000002", name: "My board", created_by: U.member })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("marketing users see the pipeline and shared boards", async () => {
    for (const user of ["member", "traffic", "leadership", "admin"] as const) {
      const ids = await visibleIds(await as(user), "boards");
      expect(ids).toEqual(expect.arrayContaining([PIPELINE, SPRINT]));
    }
  });

  it("requesters and guests see no boards they are not members of", async () => {
    expect(await visibleIds(await as("sales"), "boards")).toEqual([]);
    expect(await visibleIds(await as("guest"), "boards")).toEqual([]);
  });

  it("a guest added to a board sees it, may add cards, but cannot rename it", async () => {
    const lead = await as("leadCreative");
    const { error } = await lead.from("board_members").insert({ board_id: SPRINT, user_id: U.guest });
    expect(error).toBeNull();
    const guest = await as("guest");
    expect(await visibleIds(guest, "boards")).toEqual([SPRINT]);
    const { data: renamed } = await guest.from("boards").update({ name: "Mine" }).eq("id", SPRINT).select("id");
    expect(renamed ?? []).toEqual([]);
    const { data: list } = await guest.from("lists").select("id").eq("board_id", SPRINT).limit(1).single();
    const { error: addError } = await guest
      .from("cards")
      .insert({ board_id: SPRINT, list_id: list!.id, position: "a0V", title: "Freelancer task", created_by: U.guest });
    expect(addError).toBeNull();
    expect(await visibleIds(guest, "cards")).not.toContain("80000000-0000-4000-8000-000000000001");
    await service().from("board_members").delete().eq("board_id", SPRINT).eq("user_id", U.guest);
  });

  it("pipeline lists cannot be renamed or created by traffic", async () => {
    const traffic = await as("traffic");
    const { data } = await traffic.from("lists").update({ name: "Renamed" }).eq("board_id", PIPELINE).select("id");
    expect(data ?? []).toEqual([]);
    const { error } = await traffic.from("lists").insert({ board_id: PIPELINE, name: "Extra", position: "z" });
    expect(error).not.toBeNull();
  });

  it("leadership cannot edit boards or cards", async () => {
    const leadership = await as("leadership");
    const { data } = await leadership.from("boards").update({ name: "x" }).eq("id", SPRINT).select("id");
    expect(data ?? []).toEqual([]);
    const card = await makePipelineCard("production");
    const { data: c } = await leadership.from("cards").update({ title: "x" }).eq("id", card.id).select("id");
    expect(c ?? []).toEqual([]);
  });
});

describe("pipeline cards", () => {
  it("requesters see only their own department's pipeline cards", async () => {
    const sales = await as("sales");
    const { data } = await sales.from("cards").select("id, requesting_department_id");
    expect(data!.length).toBeGreaterThan(0);
    expect(new Set(data!.map((c) => c.requesting_department_id))).toEqual(new Set([DEPT.sales]));
  });

  it("hr (another department) sees none of the sales cards", async () => {
    const { data } = await (await as("hr")).from("cards").select("id");
    expect(data ?? []).toEqual([]);
  });

  it("requesters comment on their department's cards but cannot edit them", async () => {
    const card = await makePipelineCard("production");
    const sales = await as("sales");
    const { error: commentError } = await sales.from("comments").insert({ card_id: card.id, author_id: U.sales, body: "Looks good" });
    expect(commentError).toBeNull();
    const { data } = await sales.from("cards").update({ title: "changed" }).eq("id", card.id).select("id");
    expect(data ?? []).toEqual([]);
  });

  it("the card's approver can see it even from another department", async () => {
    const card = await makePipelineCard("confirmation", { requesting_department_id: DEPT.marketing, approver_id: U.hr });
    expect(await visibleIds(await as("hr"), "cards")).toContain(card.id);
  });

  it("escalation: an assignee cannot set stage, revision_count or a pipeline list_id directly", async () => {
    const card = await makePipelineCard("production");
    await assign(card.id, U.member);
    const member = await as("member");
    const stage = await member.from("cards").update({ stage: "ready_to_publish" } as never).eq("id", card.id);
    expect(stage.error?.code).toBe("42501");
    const rev = await member.from("cards").update({ revision_count: 0 } as never).eq("id", card.id);
    expect(rev.error?.code).toBe("42501");
    const { data: other } = await service().from("lists").select("id").eq("board_id", PIPELINE).eq("stage", "published").single();
    const list = await member.from("cards").update({ list_id: other!.id }).eq("id", card.id);
    expect(list.error).not.toBeNull();
    const ok = await member.from("cards").update({ description: "Draft v2" }).eq("id", card.id).select("id");
    expect(ok.data?.length).toBe(1);
  });

  it("nobody inserts pipeline cards directly", async () => {
    const { data: list } = await service().from("lists").select("id").eq("board_id", PIPELINE).eq("stage", "intake").single();
    const { error } = await (await as("traffic"))
      .from("cards")
      .insert({ board_id: PIPELINE, list_id: list!.id, position: "z", title: "x", stage: "intake", created_by: U.traffic });
    expect(error).not.toBeNull();
  });
});

describe("move_card_stage", () => {
  const move = async (user: Parameters<typeof as>[0], id: string, to: string, payload = {}) =>
    (await as(user)).rpc("move_card_stage", { p_card_id: id, p_to: to as never, p_payload: payload });

  it("traffic accepts a complete intake card; a member cannot", async () => {
    const card = await makePipelineCard("intake");
    expect((await move("member", card.id, "brief_schedule")).error?.code).toBe("42501");
    expect((await move("traffic", card.id, "brief_schedule")).error).toBeNull();
    expect((await cardStage(card.id)).stage).toBe("brief_schedule");
  });

  it("a card cannot leave intake without the required fields", async () => {
    const card = await makePipelineCard("intake", { objective: null, platforms: [] });
    const { error } = await move("traffic", card.id, "brief_schedule");
    expect(error?.message).toContain("missing_fields");
    expect(error?.message).toContain("objective");
    expect(error?.message).toContain("platforms");
  });

  it("returning to the requester needs a reason and notifies them", async () => {
    const card = await makePipelineCard("intake");
    expect((await move("traffic", card.id, "request")).error?.message).toContain("returned_reason");
    const { error } = await move("traffic", card.id, "request", { returned_reason: "Missing copy", missing_items: ["copy"] });
    expect(error).toBeNull();
    const { data } = await service().from("notifications").select("kind").eq("user_id", U.sales).eq("kind", "card_returned").contains("data", { card_id: card.id });
    expect(data?.length).toBe(1);
  });

  it("production needs assignees and a production due date", async () => {
    const card = await makePipelineCard("brief_schedule");
    const missing = await move("traffic", card.id, "production");
    expect(missing.error?.message).toContain("assignees");
    expect(missing.error?.message).toContain("stage_due_at");
    const due = new Date(Date.now() + 2 * 86400000).toISOString();
    const ok = await move("traffic", card.id, "production", { stage_due_at: due, assignees: [{ user_id: U.member, role: "design" }] });
    expect(ok.error).toBeNull();
    expect((await cardStage(card.id)).stage).toBe("production");
  });

  it("the performance lead can mark no input", async () => {
    const card = await makePipelineCard("performance_input");
    expect((await move("member", card.id, "intake", { no_input: true })).error?.code).toBe("42501");
    expect((await move("leadPerformance", card.id, "intake", { no_input: true })).error).toBeNull();
  });

  it("refuses forbidden transitions and manual moves out of review stages", async () => {
    const card = await makePipelineCard("production");
    expect((await move("traffic", card.id, "published")).error?.message).toContain("transition_not_allowed");
    const review = await makePipelineCard("creative_review");
    expect((await move("traffic", review.id, "confirmation")).error?.message).toMatch(/review_stage_locked|transition_not_allowed/);
    expect((await move("admin", review.id, "production")).error?.message).toContain("review_stage_locked");
  });

  it("entering creative review needs a reviewer", async () => {
    const card = await makePipelineCard("production", { reviewer_id: null });
    await assign(card.id, U.member);
    expect((await move("member", card.id, "creative_review")).error?.message).toContain("missing_reviewer");
  });
});

describe("decide_step on cards", () => {
  async function inReview() {
    const card = await makePipelineCard("production");
    await assign(card.id, U.member);
    const { error } = await (await as("member")).rpc("move_card_stage", { p_card_id: card.id, p_to: "creative_review", p_payload: {} });
    expect(error).toBeNull();
    return card;
  }

  it("review then confirmation reaches ready to publish", async () => {
    const card = await inReview();
    const step = await activeStep(card.id);
    expect(step).toMatchObject({ approver_id: U.leadCreative, card_stage: "creative_review" });
    expect((await (await as("leadCreative")).rpc("decide_step", { p_step_id: step!.id, p_decision: "approved" })).error).toBeNull();
    const confirm = await activeStep(card.id);
    expect(confirm).toMatchObject({ approver_id: U.approver, card_stage: "confirmation" });
    expect((await (await as("approver")).rpc("decide_step", { p_step_id: confirm!.id, p_decision: "approved" })).error).toBeNull();
    const after = await cardStage(card.id);
    expect(after.stage).toBe("ready_to_publish");
    expect(after.delivered_at).not.toBeNull();
  });

  it("changes requested needs a reason and adds a revision", async () => {
    const card = await inReview();
    const step = await activeStep(card.id);
    const lead = await as("leadCreative");
    const noReason = await lead.rpc("decide_step", { p_step_id: step!.id, p_decision: "changes_requested", p_comment: "redo" });
    expect(noReason.error?.message).toContain("reason");
    const ok = await lead.rpc("decide_step", { p_step_id: step!.id, p_decision: "changes_requested", p_comment: "Logo too small", p_reason: "quality" });
    expect(ok.error).toBeNull();
    const after = await cardStage(card.id);
    expect(after.stage).toBe("production");
    expect(after.revision_count).toBe(1);
  });

  it("only the step's approver decides it", async () => {
    const card = await inReview();
    const step = await activeStep(card.id);
    const { error } = await (await as("traffic")).rpc("decide_step", { p_step_id: step!.id, p_decision: "approved" });
    expect(error?.code).toBe("42501");
  });

  it("merges confirmation when the reviewer is also the approver", async () => {
    const card = await makePipelineCard("production", { approver_id: U.leadCreative });
    await assign(card.id, U.member);
    await (await as("member")).rpc("move_card_stage", { p_card_id: card.id, p_to: "creative_review", p_payload: {} });
    const step = await activeStep(card.id);
    await (await as("leadCreative")).rpc("decide_step", { p_step_id: step!.id, p_decision: "approved" });
    expect((await cardStage(card.id)).stage).toBe("ready_to_publish");
  });
});

describe("notifications", () => {
  it("a mention creates exactly one notification for the mentioned person", async () => {
    const card = await makePipelineCard("production");
    const member = await as("member");
    await member.from("comments").insert({ card_id: card.id, author_id: U.member, body: "@Marwan see this", mentions: [U.member2, U.member2] });
    const { data } = await service().from("notifications").select("id").eq("user_id", U.member2).eq("kind", "mentioned").contains("data", { card_id: card.id });
    expect(data?.length).toBe(1);
  });

  it("users read only their own notifications and change only read_at", async () => {
    const member2 = await as("member2");
    const { data } = await member2.from("notifications").select("user_id");
    expect(new Set((data ?? []).map((n) => n.user_id))).toEqual(new Set(data?.length ? [U.member2] : []));
    const bad = await member2.from("notifications").update({ kind: "x" } as never).eq("user_id", U.member2);
    expect(bad.error?.code).toBe("42501");
    const ok = await member2.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", U.member2);
    expect(ok.error).toBeNull();
  });
});

describe("internal functions", () => {
  it("clients cannot call internal helpers", async () => {
    const member = await as("member");
    const card = await makePipelineCard("production");
    const n = await member.rpc("notify" as never, { p_user_id: U.member2, p_kind: "x", p_link: "/" } as never);
    expect(n.error).not.toBeNull();
    const s = await member.rpc("_set_card_stage" as never, { p_card_id: card.id, p_to: "published" } as never);
    expect(s.error).not.toBeNull();
    const step = await member.rpc("_create_card_step" as never, { p_card_id: card.id, p_stage: "creative_review" } as never);
    expect(step.error).not.toBeNull();
  });
});
