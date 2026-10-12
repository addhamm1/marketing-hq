import { describe, expect, it } from "vitest";
import { as, BRAND_ESPACES, DEPT, makePipelineCard, service, U } from "./helpers";

const svc = service();

async function draft(user: Parameters<typeof as>[0] = "member", over: Record<string, unknown> = {}) {
  const c = await as(user);
  const { data, error } = await c
    .from("posts")
    .insert({ brand_id: BRAND_ESPACES, platforms: ["instagram"], caption_en: "Hello", owner_id: (await c.auth.getUser()).data.user!.id, ...over })
    .select("id, status")
    .single();
  if (error) throw error;
  return data!;
}
const status = async (id: string) => (await svc.from("posts").select("status").eq("id", id).single()).data?.status;

describe("posts", () => {
  it("marketing writers create drafts; leadership, guests and requesters cannot", async () => {
    expect((await draft("member")).status).toBe("draft");
    for (const u of ["leadership", "guest", "sales"] as const) {
      const c = await as(u);
      const { error } = await c.from("posts").insert({ brand_id: BRAND_ESPACES, owner_id: (await c.auth.getUser()).data.user!.id });
      expect(error).not.toBeNull();
    }
  });

  it("nobody approves or publishes by updating status directly", async () => {
    const p = await draft();
    const { error } = await (await as("leadCreative")).from("posts").update({ status: "approved" } as never).eq("id", p.id);
    expect(error?.code).toBe("42501");
  });

  it("review: a member submits, a lead approves; it becomes scheduled once it has a time", async () => {
    const p = await draft();
    expect((await (await as("member")).rpc("submit_post", { p_post_id: p.id })).error).toBeNull();
    expect((await (await as("member2")).rpc("decide_post", { p_post_id: p.id, p_approve: true })).error?.code).toBe("42501");
    expect((await (await as("leadCreative")).rpc("decide_post", { p_post_id: p.id, p_approve: true })).error).toBeNull();
    expect(await status(p.id)).toBe("approved");
    await (await as("member")).from("posts").update({ scheduled_at: new Date(Date.now() + 86400000).toISOString() }).eq("id", p.id);
    expect(await status(p.id)).toBe("scheduled");
    await (await as("member")).from("posts").update({ scheduled_at: null }).eq("id", p.id);
    expect(await status(p.id)).toBe("approved");
  });

  it("sending back needs a comment and returns the post to draft", async () => {
    const p = await draft();
    await (await as("member")).rpc("submit_post", { p_post_id: p.id });
    const lead = await as("leadCreative");
    expect((await lead.rpc("decide_post", { p_post_id: p.id, p_approve: false })).error?.message).toContain("comment");
    expect((await lead.rpc("decide_post", { p_post_id: p.id, p_approve: false, p_comment: "Fix the caption" })).error).toBeNull();
    expect(await status(p.id)).toBe("draft");
  });

  it("a ready card becomes an approved post linked both ways; publishing moves the card", async () => {
    const card = await makePipelineCard("ready_to_publish", { platforms: ["instagram", "website"] });
    const community = await as("community");
    const when = new Date(Date.now() + 3 * 86400000).toISOString();
    const { data: postId, error } = await community.rpc("create_post_from_card", { p_card_id: card.id, p_scheduled_at: when });
    expect(error).toBeNull();
    const { data: post } = await svc.from("posts").select("status, card_id, platforms, brand_id").eq("id", postId!).single();
    expect(post).toMatchObject({ status: "scheduled", card_id: card.id, platforms: ["instagram"], brand_id: BRAND_ESPACES });
    expect((await community.rpc("create_post_from_card", { p_card_id: card.id, p_scheduled_at: when })).error?.message).toContain("post_exists");
    expect((await (await as("member2")).rpc("mark_post_published", { p_post_id: postId!, p_links: {} })).error?.code).toBe("42501");
    expect((await community.rpc("mark_post_published", { p_post_id: postId!, p_links: { instagram: "https://instagram.com/p/x" } })).error).toBeNull();
    expect((await svc.from("cards").select("stage").eq("id", card.id).single()).data?.stage).toBe("published");
  });

  it("requesters see posts of their department's cards only", async () => {
    const card = await makePipelineCard("ready_to_publish", { requesting_department_id: DEPT.sales });
    const { data: postId } = await (await as("community")).rpc("create_post_from_card", { p_card_id: card.id, p_scheduled_at: new Date(Date.now() + 86400000).toISOString() });
    const { data } = await (await as("sales")).from("posts").select("id, cards!inner(requesting_department_id)");
    expect(data!.map((p) => p.id)).toContain(postId);
    expect(data!.every((p) => (p.cards as unknown as { requesting_department_id: string }).requesting_department_id === DEPT.sales)).toBe(true);
    expect(((await (await as("hr")).from("posts").select("id")).data ?? []).length).toBe(0);
  });
});

describe("post reminders", () => {
  it("reminds once per post time, again after a reschedule; overdue alert fires once", async () => {
    const p = await draft("community");
    await svc.from("posts").update({ status: "approved", scheduled_at: new Date(Date.now() + 20 * 60_000).toISOString() }).eq("id", p.id);
    await svc.rpc("cron_post_reminders", {});
    await svc.rpc("cron_post_reminders", {});
    const count = async (kind: string) =>
      ((await svc.from("notifications").select("id").eq("kind", kind).contains("data", { post_id: p.id })).data ?? []).length;
    expect(await count("post_reminder")).toBe(1);
    await svc.from("posts").update({ scheduled_at: new Date(Date.now() + 25 * 60_000).toISOString() }).eq("id", p.id);
    await svc.rpc("cron_post_reminders", {});
    expect(await count("post_reminder")).toBe(2);

    await svc.from("posts").update({ scheduled_at: new Date(Date.now() - 3 * 3600_000).toISOString() }).eq("id", p.id);
    await svc.rpc("cron_post_reminders", {});
    await svc.rpc("cron_post_reminders", {});
    expect(await count("post_overdue")).toBeGreaterThanOrEqual(1);
    const once = await count("post_overdue");
    await svc.rpc("cron_post_reminders", {});
    expect(await count("post_overdue")).toBe(once);
  });
});

describe("dashboard views", () => {
  it("a member sees only their own attendance rows; a team lead sees the team", async () => {
    await svc.rpc("check_in", { p_user_id: U.member2, p_method: "field", p_lat: 30.05, p_lng: 31.2, p_accuracy_m: 20, p_verify: {} }).then(() => undefined);
    const mine = (await (await as("member")).from("v_attendance_daily").select("user_id")).data ?? [];
    expect(new Set(mine.map((r) => r.user_id)).size).toBeLessThanOrEqual(1);
    expect(mine.every((r) => r.user_id === U.member)).toBe(true);
    const lead = (await (await as("leadCreative")).from("v_attendance_daily").select("user_id")).data ?? [];
    expect(lead.some((r) => r.user_id === U.member2)).toBe(true);
  });

  it("requesters see card flow only for their department", async () => {
    const rows = (await (await as("sales")).from("v_card_flow").select("requesting_department_id")).data ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.requesting_department_id === DEPT.sales)).toBe(true);
  });

  it("anonymous visitors cannot read views", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await anon.from("v_card_flow").select("card_id");
    expect(error ?? (data?.length === 0 ? null : "leak")).not.toBe("leak");
  });
});
