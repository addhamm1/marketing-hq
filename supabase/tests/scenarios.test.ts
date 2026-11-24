import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cairoDateString, cairoInstant, isWorkingDay } from "@/lib/dates";
import {
  activeStep, anon, as, BRAND_ESPACES, BRANCH_HQ, cardStage, DEPT, EMAIL, makePipelineCard, PASSWORD, service, U, type Client,
} from "./helpers";

// Cross-module scenarios: each one follows a piece of work through several modules,
// signed in as the real roles involved. Every scenario creates its own data and removes it.
const svc = service();
const TAG = `scn-${Date.now()}`;
// Host and database clocks may differ slightly.
const START = new Date(Date.now() - 60_000).toISOString();
const HQ = { p_lat: 30.096, p_lng: 31.326, p_accuracy_m: 10 };
const ACTIONS_BOARD = "60000000-0000-4000-8000-000000000010";
const NO_ID = null as unknown as string; // the generated types mark p_id as required
const COORDINATE = /lat|lng|lon|accuracy|distance|geo/i;
type User = Parameters<typeof as>[0];

const today = cairoDateString();
let holidays = new Set<string>();
const sessions: string[] = [];

beforeAll(async () => {
  const { data } = await svc.from("holidays").select("day, is_half_day");
  holidays = new Set((data ?? []).filter((h) => !h.is_half_day).map((h) => h.day));
});

afterAll(async () => {
  if (sessions.length) await svc.from("attendance_sessions").delete().in("id", sessions);
});

/** A Cairo date `n` days from `from`. */
function addDays(from: string, n: number) {
  return cairoDateString(new Date(cairoInstant(from, "12:00").getTime() + n * 86_400_000));
}

/** The first working day at least `min` days from today. */
function workdayFrom(min: number) {
  let day = addDays(today, min);
  while (!isWorkingDay(day, holidays)) day = addDays(day, 1);
  return day;
}

/** The first day of a month counted from this Cairo month (strategic plans are for next month in Cairo). */
function cairoMonth(offset: number) {
  const [y, m] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 10);
}

function monthAt(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString().slice(0, 10);
}

/** Notifications a person received during this run, by kind and matching data. */
async function notes(userId: string, kind: string, data: Record<string, unknown> = {}) {
  const { data: rows, error } = await svc
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .contains("data", data)
    .gte("created_at", START);
  if (error) throw error;
  return rows.length;
}

async function closeOpen(userId: string) {
  const { data } = await svc.from("attendance_sessions").select("id, checked_in_at").eq("user_id", userId).is("checked_out_at", null);
  for (const s of data ?? []) {
    const out = new Date(Math.max(Date.now(), Date.parse(s.checked_in_at) + 1000)).toISOString();
    await svc.from("attendance_sessions").update({ checked_out_at: out }).eq("id", s.id);
  }
}

async function checkIn(userId: string, args: Record<string, unknown>) {
  await closeOpen(userId);
  const { data, error } = await svc.rpc("check_in", { p_user_id: userId, ...HQ, p_verify: { test: true }, ...args } as never);
  if (error) throw error;
  sessions.push(data as string);
  return data as string;
}

const checkInWifi = (userId: string, extra: Record<string, unknown> = {}) =>
  checkIn(userId, { p_method: "wifi", p_branch_id: BRANCH_HQ, ...extra });

const presence = async (userId: string) =>
  (await svc.from("profiles").select("presence").eq("id", userId).single()).data?.presence;

const week = async (user: User, from: string, to = from) => {
  const { data, error } = await (await as(user)).rpc("team_week", { p_from: from, p_to: to, p_department_id: DEPT.marketing });
  if (error) throw error;
  return data;
};

const line = (title: string) => ({
  title,
  objective: "Fill the event",
  vertical: "Offices",
  brand_id: BRAND_ESPACES,
  format: "reel",
  platforms: ["instagram"],
  due_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
});

// ---------------------------------------------------------------------------
describe("scenario: a department request travels from the portal to a published post", () => {
  const title = `${TAG} urgent reel`;
  const cards: string[] = [];
  let card = "";
  let plan = "";
  let post = "";

  afterAll(async () => {
    if (post) {
      await svc.from("notifications").delete().eq("data->>post_id", post);
      await svc.from("posts").delete().eq("id", post);
    }
    for (const id of cards) await svc.from("notifications").delete().eq("data->>card_id", id);
    if (cards.length) {
      await svc.from("approval_steps").delete().eq("subject_type", "card").in("subject_id", cards);
      await svc.from("cards").delete().in("id", cards);
    }
    if (plan) await svc.from("strategic_plans").delete().eq("id", plan);
    await svc.from("notifications").delete().eq("kind", "strategic_submitted").gte("created_at", START);
  });

  it("the requester submits an urgent request and a strategic plan; traffic and the performance lead are told", async () => {
    const sales = await as("sales");
    const urgent = await sales.rpc("submit_urgent_request", { payload: { ...line(title), urgent_reason: "Launch event moved forward" } });
    expect(urgent.error).toBeNull();
    card = urgent.data!;
    cards.push(card);
    expect(await notes(U.traffic, "urgent_submitted", { card_id: card })).toBe(1);
    expect(await notes(U.leadPerformance, "urgent_submitted", { card_id: card })).toBe(1);

    const next = cairoMonth(1);
    const strategic = await sales.rpc("submit_strategic_plan", { payload: { for_month: next, lines: [line(`${TAG} plan A`), line(`${TAG} plan B`)] } });
    expect(strategic.error).toBeNull();
    plan = strategic.data!;
    const { data: planCards } = await svc.from("cards").select("id, stage").eq("strategic_plan_id", plan);
    cards.push(...planCards!.map((c) => c.id));
    expect(planCards!.map((c) => c.stage)).toEqual(["performance_input", "performance_input"]);
    expect(await notes(U.traffic, "strategic_submitted", { count: 2 })).toBeGreaterThanOrEqual(1);
    expect(await notes(U.leadPerformance, "strategic_submitted", { count: 2 })).toBeGreaterThanOrEqual(1);

    const { data } = await svc.from("cards").select("stage, request_kind, priority, requester_id, reviewer_id, approver_id").eq("id", card).single();
    expect(data).toEqual({
      stage: "performance_input", request_kind: "urgent", priority: "urgent",
      requester_id: U.sales, reviewer_id: U.leadCreative, approver_id: U.approver,
    });
  });

  it("the department and marketing see the request; another department does not", async () => {
    for (const user of ["sales", "approver", "member", "traffic"] as const) {
      expect((await (await as(user)).from("cards").select("id").eq("id", card)).data, user).toHaveLength(1);
    }
    for (const user of ["hr", "guest", "norole", "inactive"] as const) {
      expect((await (await as(user)).from("cards").select("id").eq("id", card)).data ?? [], user).toEqual([]);
    }
  });

  it("performance input, then traffic accepts, briefs and assigns production", async () => {
    const perf = await as("leadPerformance");
    expect((await perf.rpc("move_card_stage", { p_card_id: card, p_to: "intake", p_payload: { performance_notes: "Boost 3 days, 25-34" } })).error).toBeNull();
    expect((await (await as("member")).rpc("move_card_stage", { p_card_id: card, p_to: "brief_schedule" })).error?.code).toBe("42501");

    const traffic = await as("traffic");
    expect((await traffic.rpc("move_card_stage", { p_card_id: card, p_to: "brief_schedule" })).error).toBeNull();
    const due = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const started = await traffic.rpc("move_card_stage", {
      p_card_id: card, p_to: "production", p_payload: { stage_due_at: due, assignees: [{ user_id: U.member, role: "video" }] },
    });
    expect(started.error).toBeNull();
    expect(await notes(U.member, "assigned", { card_id: card })).toBe(1);
    const { data } = await svc.from("cards").select("stage, stage_due_at, performance_notes").eq("id", card).single();
    expect(data!.stage).toBe("production");
    expect(Date.parse(data!.stage_due_at!)).toBe(Date.parse(due));
    expect(data!.performance_notes).toBe("Boost 3 days, 25-34");
  });

  it("creative review asks for changes, then approves; the department approver confirms", async () => {
    const member = await as("member");
    const lead = await as("leadCreative");
    expect((await member.rpc("move_card_stage", { p_card_id: card, p_to: "creative_review" })).error).toBeNull();
    expect(await notes(U.leadCreative, "approval_waiting", { card_id: card })).toBe(1);

    let step = await activeStep(card);
    expect(step).toMatchObject({ approver_id: U.leadCreative, card_stage: "creative_review" });
    const changes = await lead.rpc("decide_step", { p_step_id: step!.id, p_decision: "changes_requested", p_comment: "Logo too small", p_reason: "quality" });
    expect(changes.error).toBeNull();
    expect(await cardStage(card)).toMatchObject({ stage: "production", revision_count: 1 });
    expect(await notes(U.member, "card_changes_requested", { card_id: card })).toBe(1);

    expect((await member.rpc("move_card_stage", { p_card_id: card, p_to: "creative_review" })).error).toBeNull();
    expect(await notes(U.leadCreative, "approval_waiting", { card_id: card })).toBe(2);
    step = await activeStep(card);
    expect((await lead.rpc("decide_step", { p_step_id: step!.id, p_decision: "approved" })).error).toBeNull();
    expect((await cardStage(card)).stage).toBe("confirmation");
    expect(await notes(U.approver, "approval_waiting", { card_id: card })).toBe(1);

    const confirm = await activeStep(card);
    expect(confirm).toMatchObject({ approver_id: U.approver, card_stage: "confirmation" });
    expect((await (await as("sales")).rpc("decide_step", { p_step_id: confirm!.id, p_decision: "approved" })).error?.code).toBe("42501");
    expect((await (await as("approver")).rpc("decide_step", { p_step_id: confirm!.id, p_decision: "approved" })).error).toBeNull();
    const after = await cardStage(card);
    expect(after.stage).toBe("ready_to_publish");
    expect(after.delivered_at).not.toBeNull();
    expect(await notes(U.sales, "card_delivered", { card_id: card })).toBe(1);
  });

  it("a post is made from the card, already approved, and marking it published publishes the card", async () => {
    const when = new Date(Date.now() + 2 * 86_400_000).toISOString();
    expect((await (await as("sales")).rpc("create_post_from_card", { p_card_id: card, p_scheduled_at: when })).error?.code).toBe("42501");

    const community = await as("community");
    const created = await community.rpc("create_post_from_card", { p_card_id: card, p_scheduled_at: when });
    expect(created.error).toBeNull();
    post = created.data!;
    const { data: p } = await svc.from("posts").select("status, card_id, approved_by, platforms").eq("id", post).single();
    expect(p).toEqual({ status: "scheduled", card_id: card, approved_by: U.approver, platforms: ["instagram"] });
    expect((await community.rpc("create_post_from_card", { p_card_id: card, p_scheduled_at: when })).error?.message).toContain("post_exists");

    expect((await (await as("sales")).from("posts").select("id").eq("id", post)).data).toHaveLength(1);
    expect((await (await as("hr")).from("posts").select("id").eq("id", post)).data).toEqual([]);

    expect((await (await as("member2")).rpc("mark_post_published", { p_post_id: post })).error?.code).toBe("42501");
    const published = await community.rpc("mark_post_published", { p_post_id: post, p_links: { instagram: "https://instagram.com/p/scenario" } });
    expect(published.error).toBeNull();
    const { data: done } = await svc.from("posts").select("status, published_at").eq("id", post).single();
    expect(done!.status).toBe("published");
    expect(done!.published_at).not.toBeNull();
    const { data: c } = await svc.from("cards").select("stage, published_at").eq("id", card).single();
    expect(c!.stage).toBe("published");
    expect(c!.published_at).not.toBeNull();
  });

  it("when the reviewer is also the department's approver, review and confirmation merge and the requester is still told", async () => {
    const merged = await makePipelineCard("production", { title: `${TAG} merged`, reviewer_id: U.approver, approver_id: U.approver });
    cards.push(merged.id);
    await svc.from("card_assignees").insert({ card_id: merged.id, user_id: U.member, role: "design" });
    expect((await (await as("member")).rpc("move_card_stage", { p_card_id: merged.id, p_to: "creative_review" })).error).toBeNull();
    const step = await activeStep(merged.id);
    expect(step).toMatchObject({ approver_id: U.approver, card_stage: "creative_review" });
    expect((await (await as("approver")).rpc("decide_step", { p_step_id: step!.id, p_decision: "approved" })).error).toBeNull();
    expect((await cardStage(merged.id)).stage).toBe("ready_to_publish");
    expect(await notes(U.sales, "card_delivered", { card_id: merged.id })).toBe(1);
  });

  it("departments without next month's plan are reminded before the deadline, once; a department that sent one is not", async () => {
    // The deadline is this month's deadline day (25 unless set), moved back to a working day (D-25); reminders go 5 days before.
    const { data: setting } = await svc.from("settings").select("value").eq("key", "strategic_deadline_day").maybeSingle();
    let deadline = `${today.slice(0, 8)}${String(Number(setting?.value ?? 25)).padStart(2, "0")}`;
    while (!isWorkingDay(deadline, holidays)) deadline = addDays(deadline, -1);
    const at = cairoInstant(addDays(deadline, -5), "09:00").toISOString();
    const next = cairoMonth(1);
    await svc.from("cron_log").delete().in("key", [`strategic:${U.hr}:${next}:5`, `strategic:${U.sales}:${next}:5`]);
    for (let i = 0; i < 2; i++) expect((await svc.rpc("cron_strategic_reminders", { p_now: at })).error).toBeNull();
    expect(await notes(U.hr, "strategic_reminder", { for_month: next, days: 5 })).toBe(1);
    expect(await notes(U.sales, "strategic_reminder", { for_month: next })).toBe(0);
    expect(await notes(U.member, "strategic_reminder")).toBe(0);
    await svc.from("notifications").delete().eq("kind", "strategic_reminder").gte("created_at", START);
  });

  it("the requester's tracker data shows every step in order", async () => {
    const sales = await as("sales");
    const { data: events, error } = await sales
      .from("card_events")
      .select("kind, to_stage, created_at, decision:data->>decision")
      .eq("card_id", card)
      .order("created_at");
    expect(error).toBeNull();
    expect(events!.filter((e) => e.kind === "stage_change").map((e) => e.to_stage)).toEqual([
      "performance_input", "intake", "brief_schedule", "production", "creative_review",
      "production", "creative_review", "confirmation", "ready_to_publish", "published",
    ]);
    expect(events!.filter((e) => e.kind === "approval").map((e) => e.decision)).toEqual(["changes_requested", "approved", "approved"]);

    const { data: periods } = await sales.from("card_stage_periods").select("stage, entered_at, left_at").eq("card_id", card);
    expect(periods).toHaveLength(11);
    const open = periods!.filter((p) => p.left_at === null);
    expect(open.map((p) => p.stage)).toEqual(["published"]);
    for (const p of periods!) if (p.left_at) expect(Date.parse(p.left_at)).toBeGreaterThanOrEqual(Date.parse(p.entered_at));
    expect(new Set(periods!.map((p) => p.stage))).toEqual(
      new Set(["request", "performance_input", "intake", "brief_schedule", "production", "creative_review", "confirmation", "ready_to_publish", "published"]),
    );

    const { data: mine } = await sales.from("notifications").select("kind").eq("data->>card_id", card);
    expect(mine!.map((n) => n.kind)).toEqual(["card_delivered"]);
  });
});

// ---------------------------------------------------------------------------
describe("scenario: a meeting turns into work", () => {
  const meetings: string[] = [];
  const cards: string[] = [];
  let room = "";
  let meeting = "";
  let series = "";
  const time = { starts_at: "2031-07-15T09:00:00Z", ends_at: "2031-07-15T09:45:00Z" };

  beforeAll(async () => {
    const { data, error } = await svc.from("meeting_rooms").insert({ branch_id: BRANCH_HQ, name_en: `${TAG} room`, name_ar: "غرفة" }).select("id").single();
    if (error) throw error;
    room = data.id;
  });

  afterAll(async () => {
    await closeOpen(U.member2);
    await svc.from("profiles").update({ presence: "available" }).in("id", [U.member, U.member2]);
    if (series) {
      const { data } = await svc.from("meetings").select("id").eq("series_id", series);
      meetings.push(...(data ?? []).map((m) => m.id));
    }
    for (const id of meetings) await svc.from("notifications").delete().eq("data->>meeting_id", id);
    for (const id of cards) await svc.from("notifications").delete().eq("data->>card_id", id);
    if (cards.length) await svc.from("cards").delete().in("id", cards);
    if (meetings.length) await svc.from("meetings").delete().in("id", meetings);
    if (series) await svc.from("meeting_series").delete().eq("id", series);
    await svc.from("meeting_rooms").delete().eq("id", room);
  });

  it("a member books a colleague, an outside guest and a room; the room cannot be double-booked", async () => {
    const member = await as("member");
    const booked = await member.rpc("save_meeting", {
      p_id: NO_ID,
      p: {
        title: `${TAG} planning`, agenda: "Budget and timing", ...time, room_id: room, attendee_ids: [U.member2],
        guests: [{ name: "Outside Guest", email: "Outside.Guest@Example.com" }],
      },
    });
    expect(booked.error).toBeNull();
    meeting = booked.data!;
    meetings.push(meeting);
    expect(await notes(U.member2, "meeting_invite", { meeting_id: meeting })).toBe(1);

    const { data: guests } = await member.from("meeting_guests").select("email, invited_at").eq("meeting_id", meeting);
    expect(guests).toEqual([{ email: "outside.guest@example.com", invited_at: null }]);
    const { data: people } = await member.from("meeting_attendees").select("user_id, response").eq("meeting_id", meeting).order("user_id");
    expect(people).toEqual([{ user_id: U.member, response: "accepted" }, { user_id: U.member2, response: "pending" }]);

    const traffic = await as("traffic");
    const clash = await traffic.rpc("save_meeting", {
      p_id: NO_ID, p: { title: `${TAG} clash`, starts_at: "2031-07-15T09:30:00Z", ends_at: "2031-07-15T10:00:00Z", room_id: room },
    });
    expect(clash.error?.code).toBe("23P01");
    const backToBack = await traffic.rpc("save_meeting", {
      p_id: NO_ID, p: { title: `${TAG} next`, starts_at: time.ends_at, ends_at: "2031-07-15T10:15:00Z", room_id: room },
    });
    expect(backToBack.error).toBeNull();
    meetings.push(backToBack.data!);

    // A requester sees that the room is taken, never by what.
    const { data: busy } = await (await as("sales")).rpc("meeting_busy", { p_from: time.starts_at, p_to: time.ends_at, p_user_ids: [] });
    const roomBusy = busy!.filter((b) => b.id === room);
    expect(roomBusy).toHaveLength(1);
    expect(JSON.stringify(roomBusy)).not.toContain(TAG);
  });

  it("the colleague declines and the organiser is told", async () => {
    expect((await (await as("member2")).rpc("respond_meeting", { p_id: meeting, p_response: "declined" })).error).toBeNull();
    expect(await notes(U.member, "meeting_declined", { meeting_id: meeting })).toBe(1);
    const { data: busy } = await (await as("member")).rpc("meeting_busy", { p_from: time.starts_at, p_to: time.ends_at, p_user_ids: [U.member2] });
    expect(busy!.filter((b) => b.kind === "user")).toEqual([]);
  });

  it("an action item becomes a card on the Meeting actions board for the colleague, told once", async () => {
    const member = await as("member");
    const { data: action, error } = await member
      .from("meeting_actions")
      .insert({ meeting_id: meeting, title: `${TAG} send the brief`, assignee_id: U.member2, due_on: "2031-07-20", created_by: U.member })
      .select("id")
      .single();
    expect(error).toBeNull();
    const converted = await member.rpc("meeting_action_to_card", { p_action_id: action!.id });
    expect(converted.error).toBeNull();
    const cardId = converted.data!;
    cards.push(cardId);

    const { data: c } = await svc.from("cards").select("board_id, title, stage, due_at, card_assignees(user_id, role)").eq("id", cardId).single();
    expect(c).toMatchObject({ board_id: ACTIONS_BOARD, title: `${TAG} send the brief`, stage: null, card_assignees: [{ user_id: U.member2, role: "other" }] });
    expect(Date.parse(c!.due_at!)).toBe(cairoInstant("2031-07-20", "18:00").getTime());
    expect((await (await as("member2")).from("cards").select("id").eq("id", cardId)).data).toHaveLength(1);
    expect((await (await as("sales")).from("cards").select("id").eq("id", cardId)).data).toEqual([]);

    // One notification for one assignment, worded for the meeting.
    expect(await notes(U.member2, "meeting_action_assigned", { card_id: cardId, meeting_id: meeting })).toBe(1);
    expect(await notes(U.member2, "assigned", { card_id: cardId })).toBe(0);

    expect((await member.rpc("meeting_action_to_card", { p_action_id: action!.id })).data).toBe(cardId);
  });

  it("archiving the card closes the action", async () => {
    const { data: action } = await svc.from("meeting_actions").select("id, card_id, done").eq("meeting_id", meeting).single();
    expect(action!.done).toBe(false);
    const { data } = await (await as("member2")).from("cards").update({ archived_at: new Date().toISOString() }).eq("id", action!.card_id!).select("id");
    expect(data).toHaveLength(1);
    expect((await svc.from("meeting_actions").select("done").eq("id", action!.id).single()).data?.done).toBe(true);
  });

  it("cancelling tells the attendees and frees the room", async () => {
    expect((await (await as("member")).rpc("cancel_meeting", { p_id: meeting })).error).toBeNull();
    expect(await notes(U.member2, "meeting_cancelled", { meeting_id: meeting })).toBe(1);
    const again = await (await as("traffic")).rpc("save_meeting", { p_id: NO_ID, p: { title: `${TAG} rebooked`, ...time, room_id: room } });
    expect(again.error).toBeNull();
    meetings.push(again.data!);
  });

  /** Runs cron_meetings at a moment in the future, then undoes what it did to meetings that are not ours. */
  async function cronMeetingsAt(at: string, ours: string) {
    const soon = new Date(Date.parse(at) + 15 * 60_000).toISOString();
    const [{ data: ended }, { data: reminded }] = await Promise.all([
      svc.from("meetings").select("id").eq("status", "scheduled").lte("ends_at", at).neq("id", ours),
      svc.from("meetings").select("id").eq("status", "scheduled").is("reminded_at", null).gte("starts_at", at).lte("starts_at", soon).neq("id", ours),
    ]);
    const { error } = await svc.rpc("cron_meetings", { p_now: at });
    if (error) throw error;
    const endedIds = (ended ?? []).map((m) => m.id);
    const remindedIds = (reminded ?? []).map((m) => m.id);
    if (endedIds.length) await svc.from("meetings").update({ status: "scheduled" }).in("id", endedIds);
    if (remindedIds.length) {
      await svc.from("meetings").update({ reminded_at: null }).in("id", remindedIds);
      for (const id of remindedIds) await svc.from("notifications").delete().eq("kind", "meeting_soon").eq("data->>meeting_id", id);
    }
  }

  it("a fixed meeting: cron creates it once, reminds once, and sets 'In a meeting' for a checked-in attendee only while it runs", async () => {
    const day = workdayFrom(1);
    const saved = await (await as("traffic")).rpc("save_meeting_series", {
      p_id: NO_ID,
      p: {
        title: `${TAG} fixed`, cadence: "daily", weekdays: [], start_time: "15:30", duration_minutes: 30,
        audience: "custom", member_ids: [U.member, U.member2], starts_on: day, ends_on: day,
      },
    });
    expect(saved.error).toBeNull();
    series = saved.data!;

    const occurrences = async () =>
      (await svc.from("meetings").select("id, starts_at, ends_at, status, meeting_attendees(user_id, response)").eq("series_id", series)).data!;
    let occ = await occurrences();
    expect(occ).toHaveLength(1);
    expect(Date.parse(occ[0].starts_at)).toBe(cairoInstant(day, "15:30").getTime());
    expect(occ[0].meeting_attendees.map((a) => [a.user_id, a.response]).sort()).toEqual([[U.member, "accepted"], [U.member2, "accepted"]]);

    expect((await svc.rpc("cron_meetings", { p_now: new Date().toISOString() })).error).toBeNull();
    occ = await occurrences();
    expect(occ).toHaveLength(1);
    const o = occ[0];

    await svc.from("profiles").update({ presence: "available" }).in("id", [U.member, U.member2]);
    await closeOpen(U.member);
    await checkInWifi(U.member2);

    const before = new Date(Date.parse(o.starts_at) - 10 * 60_000).toISOString();
    await cronMeetingsAt(before, o.id);
    await cronMeetingsAt(before, o.id);
    expect(await notes(U.member2, "meeting_soon", { meeting_id: o.id })).toBe(1);
    expect(await notes(U.member, "meeting_soon", { meeting_id: o.id })).toBe(1);

    await cronMeetingsAt(new Date(Date.parse(o.starts_at) + 60_000).toISOString(), o.id);
    expect(await presence(U.member2)).toBe("meeting");
    expect(await presence(U.member)).toBe("available");

    await cronMeetingsAt(new Date(Date.parse(o.ends_at) + 60_000).toISOString(), o.id);
    expect(await presence(U.member2)).toBe("available");
    expect((await svc.from("meetings").select("status").eq("id", o.id).single()).data?.status).toBe("done");
  });
});

// ---------------------------------------------------------------------------
describe("scenario: a month of gates", () => {
  const MONTH = monthAt(10);
  const NEXT = monthAt(11);
  const day = (d: number) => `${MONTH.slice(0, 8)}${String(d).padStart(2, "0")}`;
  const cronAt = async (d: number) => {
    const { error } = await svc.rpc("cron_gates", { p_now: `${day(d)}T09:00:00Z` });
    if (error) throw error;
  };
  let track = "";
  let gate = "";
  let card = "";

  async function addItem(name: string, due: number, owner: string) {
    const { data, error } = await (await as("traffic")).rpc("save_gate_item", {
      p_id: NO_ID,
      p: { month: MONTH, track_id: track, kind: "gate", name_en: `${TAG} ${name}`, name_ar: "بوابة", starts_on: day(due), due_on: day(due), owner_id: owner, status: "not_started", note: "" },
    });
    if (error) throw error;
    return data!;
  }

  beforeAll(async () => {
    const { data, error } = await svc.from("gate_tracks").insert({ key: `${TAG}-track`, name_en: "Scenario", name_ar: "سيناريو", position: 95 }).select("id").single();
    if (error) throw error;
    track = data.id;
    card = (await makePipelineCard("production", { title: `${TAG} gate card` })).id;
  });

  afterAll(async () => {
    const { data: items } = await svc.from("gate_items").select("id").in("month", [MONTH, NEXT]);
    for (const i of items ?? []) await svc.from("notifications").delete().eq("data->>item_id", i.id);
    await svc.from("gate_item_exclusions").delete().in("month", [MONTH, NEXT]);
    await svc.from("gate_items").delete().in("month", [MONTH, NEXT]);
    await svc.from("gate_tracks").delete().eq("id", track);
    await svc.from("cards").delete().eq("id", card);
  });

  it("a member opens the month, which builds it; traffic adds a gate the member owns", async () => {
    expect((await (await as("member")).rpc("ensure_gate_month", { p_month: MONTH })).error).toBeNull();
    const { data: built } = await svc.from("gate_items").select("id").eq("month", MONTH);
    expect(built!.length).toBeGreaterThan(0);
    gate = await addItem("content plan", 20, U.member);
  });

  it("the owner updates the status; a colleague, leadership, a requester and a guest cannot; staff read it", async () => {
    expect((await (await as("member")).rpc("set_gate_status", { p_id: gate, p_status: "in_progress", p_note: "Drafting" })).error).toBeNull();
    for (const user of ["member2", "leadership", "sales", "guest"] as const) {
      const { error } = await (await as(user)).rpc("set_gate_status", { p_id: gate, p_status: "done" });
      expect(error?.code, user).toBe("42501");
    }
    expect((await (await as("traffic")).rpc("set_gate_status", { p_id: gate, p_status: "at_risk" })).error).toBeNull();
    for (const user of ["member2", "sales", "leadership", "hr"] as const) {
      const { data } = await (await as(user)).from("gate_items").select("status, note").eq("id", gate);
      expect(data, user).toEqual([{ status: "at_risk", note: "Drafting" }]);
    }
    expect((await (await as("guest")).from("gate_items").select("id").eq("id", gate)).data).toEqual([]);
  });

  it("a card is linked by the gate's owner; a colleague cannot link it", async () => {
    expect((await (await as("member2")).from("gate_item_cards").insert({ item_id: gate, card_id: card })).error?.code).toBe("42501");
    expect((await (await as("member")).from("gate_item_cards").insert({ item_id: gate, card_id: card })).error).toBeNull();
    // The requesting department sees the link to its own card.
    expect((await (await as("sales")).from("gate_item_cards").select("card_id").eq("item_id", gate)).data).toEqual([{ card_id: card }]);
  });

  it("cron_gates reminds the owner once at 3 days, 1 day and on the day", async () => {
    for (const d of [17, 17, 19, 19, 20, 20]) await cronAt(d);
    for (const days of [3, 1, 0]) expect(await notes(U.member, "gate_due_soon", { item_id: gate, days }), `${days} days`).toBe(1);
    expect(await notes(U.member, "gate_due_soon", { item_id: gate })).toBe(3);
    expect(await notes(U.traffic, "gate_due_soon", { item_id: gate })).toBe(0);
  });

  it("overdue alerts go out once, only for gates missed in the last three days", async () => {
    const near = await addItem("missed two days ago", 10, U.member2);
    const far = await addItem("missed five days ago", 7, U.member2);
    const finished = await addItem("finished on time", 11, U.member2);
    expect((await (await as("member2")).rpc("set_gate_status", { p_id: finished, p_status: "done" })).error).toBeNull();
    await cronAt(12);
    await cronAt(12);
    for (const user of [U.member2, U.traffic, U.admin]) {
      expect(await notes(user, "gate_overdue", { item_id: near })).toBe(1);
      expect(await notes(user, "gate_overdue", { item_id: far })).toBe(0);
      expect(await notes(user, "gate_overdue", { item_id: finished })).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
describe("scenario: a shoot day", () => {
  // Nobody else checks this person in, so today's week cell is theirs to read.
  const CREW = U.leadCreative;
  const shoots: string[] = [];
  let shoot = "";

  beforeAll(async () => {
    await closeOpen(CREW);
    await svc.from("profiles").update({ presence: "available" }).eq("id", CREW);
  });

  afterAll(async () => {
    await closeOpen(CREW);
    await closeOpen(U.traffic);
    await svc.from("profiles").update({ presence: "available" }).in("id", [CREW, U.traffic]);
    for (const id of shoots) await svc.from("notifications").delete().eq("data->>shoot_id", id);
    if (shoots.length) await svc.from("shoots").delete().in("id", shoots);
  });

  it("traffic plans a shoot with crew and shots; the crew member is told and the week shows the shoot", async () => {
    const traffic = await as("traffic");
    const { data, error } = await traffic
      .from("shoots")
      .insert({ title: `${TAG} rooftop shoot`, shoot_on: today, call_time: "09:00", location_name: "Zamalek rooftop", created_by: U.traffic })
      .select("id")
      .single();
    expect(error).toBeNull();
    shoot = data!.id;
    shoots.push(shoot);
    expect((await traffic.from("shoot_crew").insert([
      { shoot_id: shoot, user_id: CREW, role: "Director" },
      { shoot_id: shoot, external_name: "Freelance stylist", role: "Stylist" },
    ])).error).toBeNull();
    expect((await traffic.from("shoot_shots").insert([
      { shoot_id: shoot, description: "Wide of the terrace", position: 1 },
      { shoot_id: shoot, description: "Team at the long table", position: 2 },
    ])).error).toBeNull();
    expect(await notes(CREW, "shoot_crew_added", { shoot_id: shoot })).toBe(1);

    const cell = (await week("sales", today)).find((r) => r.user_id === CREW)!;
    expect(cell).toMatchObject({ kind: "shoot", place: "Zamalek rooftop" });
  });

  it("the crew member checks in to the shoot: presence becomes shoot and the day still shows the shoot", async () => {
    await checkIn(CREW, { p_method: "field", p_lat: 30.0626, p_lng: 31.2197, p_accuracy_m: 25, p_shoot_id: shoot });
    expect(await presence(CREW)).toBe("shoot");
    const { data: s } = await svc.from("attendance_sessions").select("method, branch_id, shoot_id, checkin_place").eq("user_id", CREW).is("checked_out_at", null).single();
    expect(s).toEqual({ method: "field", branch_id: null, shoot_id: shoot, checkin_place: "Zamalek rooftop" });

    for (const user of ["sales", "member"] as const) {
      const cell = (await week(user, today)).find((r) => r.user_id === CREW)!;
      expect(cell, user).toMatchObject({ kind: "shoot", place: "Zamalek rooftop" });
    }
  });

  it("a requester sees the place, never coordinates, the session or the shoot plan", async () => {
    const rows = await week("sales", today);
    expect(Object.keys(rows[0]).filter((k) => COORDINATE.test(k))).toEqual([]);
    expect(JSON.stringify(rows)).not.toContain("30.0626");
    const sales = await as("sales");
    expect((await sales.from("attendance_sessions").select("id").eq("user_id", CREW)).data).toEqual([]);
    expect((await sales.from("shoots").select("id").eq("id", shoot)).data).toEqual([]);
    expect((await sales.rpc("who_is_in", {})).data).toEqual([]);
    // Marketing sees where, but not the coordinates either.
    const { data: inside } = await (await as("member")).rpc("who_is_in", {});
    const row = inside!.find((r) => r.user_id === CREW)!;
    expect(row).toMatchObject({ method: "field", checkin_place: "Zamalek rooftop" });
    expect(Object.keys(row).filter((k) => COORDINATE.test(k))).toEqual([]);
  });

  it("someone on a shoot is not on a branch floor: no moving there, and colleagues there cannot wave", async () => {
    expect((await (await as("leadCreative")).rpc("map_move", { p_branch_id: BRANCH_HQ, p_x: 5, p_y: 5 })).error?.message).toContain("not_checked_in");
    await checkInWifi(U.traffic);
    expect((await (await as("traffic")).rpc("map_interact", { p_to: CREW, p_kind: "wave" })).error?.message).toContain("not_here");
  });

  it("a shoot at a branch keeps the branch on the week after check-in", async () => {
    await closeOpen(CREW);
    const { data } = await svc
      .from("shoots")
      .insert({ title: `${TAG} studio shoot`, shoot_on: today, branch_id: BRANCH_HQ, created_by: U.traffic })
      .select("id")
      .single();
    shoots.push(data!.id);
    await svc.from("shoot_crew").insert({ shoot_id: data!.id, user_id: CREW, role: "Director" });
    await checkIn(CREW, { p_method: "field", p_lat: 30.096, p_lng: 31.326, p_accuracy_m: 15, p_shoot_id: data!.id });
    // Two check-ins today: the latest one, at the branch shoot, is the one shown.
    const cell = (await week("sales", today)).find((r) => r.user_id === CREW)!;
    expect(cell).toMatchObject({ kind: "shoot", branch_id: BRANCH_HQ, place: "Marketing HQ", source: "checkin" });
  });

  it("the day before a shoot, the daily job reminds its crew once", async () => {
    const tomorrow = addDays(today, 1);
    const { data } = await svc
      .from("shoots")
      .insert({ title: `${TAG} tomorrow's shoot`, shoot_on: tomorrow, location_name: "New Cairo office", created_by: U.traffic })
      .select("id")
      .single();
    shoots.push(data!.id);
    await svc.from("shoot_crew").insert([{ shoot_id: data!.id, user_id: CREW, role: "Director" }, { shoot_id: data!.id, user_id: U.member, role: "Camera" }]);
    for (let i = 0; i < 2; i++) expect((await svc.rpc("cron_shoots", { p_now: new Date().toISOString() })).error).toBeNull();
    expect(await notes(CREW, "shoot_tomorrow", { shoot_id: data!.id })).toBe(1);
    expect(await notes(U.member, "shoot_tomorrow", { shoot_id: data!.id })).toBe(1);
    expect(await notes(U.member2, "shoot_tomorrow", { shoot_id: data!.id })).toBe(0);
  });

  it("checking out ends the shoot status", async () => {
    const out = await (await as("leadCreative")).rpc("check_out", { p_lat: 30.0626, p_lng: 31.2197, p_accuracy_m: 20 });
    expect(out.error).toBeNull();
    expect(await presence(CREW)).toBe("available");
  });
});

// ---------------------------------------------------------------------------
describe("scenario: attendance and leave", () => {
  const PERSON = U.member2;
  const requests: string[] = [];
  const leaveDay = "2027-09-14"; // a Tuesday
  const meetings: string[] = [];

  afterAll(async () => {
    await closeOpen(PERSON);
    const hr = await as("hr");
    for (const id of requests) {
      const { data } = await svc.from("requests").select("status").eq("id", id).single();
      if (data?.status === "approved") await hr.rpc("cancel_request", { p_request_id: id });
      await svc.from("notifications").delete().eq("data->>request_id", id);
    }
    if (requests.length) {
      await svc.from("approval_steps").delete().eq("subject_type", "request").in("subject_id", requests);
      await svc.from("requests").delete().in("id", requests);
    }
    for (const id of meetings) await svc.from("notifications").delete().eq("data->>meeting_id", id);
    if (meetings.length) await svc.from("meetings").delete().in("id", meetings);
    await svc.from("notifications").delete().eq("user_id", PERSON).eq("kind", "auto_checkout").gte("created_at", START);
  });

  async function approveAll(id: string) {
    for (let i = 0; i < 5; i++) {
      const { data: steps } = await svc.from("approval_steps").select("id, approver_id").eq("subject_type", "request").eq("subject_id", id).eq("status", "active");
      const step = steps?.find((s) => Object.values(U).includes(s.approver_id as never));
      if (!step) return;
      const who = (Object.keys(U) as User[]).find((k) => U[k] === step.approver_id)!;
      const { error } = await (await as(who)).rpc("decide_step", { p_step_id: step.id, p_decision: "approved" });
      if (error) throw error;
    }
  }

  it("every check-in method and the check-out need a location", async () => {
    await closeOpen(PERSON);
    for (const method of ["gps", "wifi", "field", "home"] as const) {
      const { error } = await svc.rpc("check_in", { p_user_id: PERSON, p_method: method, p_branch_id: BRANCH_HQ });
      expect(error?.message, method).toContain("location_required");
    }
    await checkInWifi(PERSON);
    const member2 = await as("member2");
    expect((await member2.rpc("check_out", { p_lat: null as never, p_lng: 31.3, p_accuracy_m: 10 })).error?.message).toContain("location_required");
    expect((await member2.rpc("check_out", { p_lat: 30.096, p_lng: 31.326, p_accuracy_m: 12 })).error).toBeNull();
    expect((await member2.rpc("check_out", { p_lat: 30.096, p_lng: 31.326, p_accuracy_m: 12 })).error?.message).toContain("not_checked_in");
  });

  it("approved leave shows as away on the week, and colleagues cannot tell it was leave", async () => {
    const { data: id, error } = await (await as("member2")).rpc("submit_request", { type_key: "casual_leave", data: { starts_on: leaveDay, ends_on: leaveDay } });
    expect(error).toBeNull();
    requests.push(id!);
    await approveAll(id!);
    expect((await svc.from("requests").select("status").eq("id", id!).single()).data?.status).toBe("approved");
    expect(await notes(PERSON, "request_decided", { request_id: id })).toBe(1);

    const cell = async (user: User) => (await week(user, leaveDay)).find((r) => r.user_id === PERSON)!;
    for (const user of ["member", "sales"] as const) {
      expect(await cell(user), user).toMatchObject({ kind: "away", source: "plan", place: null, branch_id: null });
    }
    for (const user of ["member2", "traffic", "admin"] as const) {
      expect((await cell(user)).source, user).toBe("leave");
    }
    // The calendar (team_absences) still lists it for marketing.
    const { data: absences } = await (await as("member")).rpc("team_absences", { p_from: leaveDay, p_to: leaveDay });
    expect(absences!.filter((a) => a.user_id === PERSON).map((a) => a.category)).toEqual(["leave"]);
    // The days around it are untouched.
    for (const other of [addDays(leaveDay, -1), addDays(leaveDay, 2)]) {
      expect((await week("member", other)).find((r) => r.user_id === PERSON)!.kind, other).not.toBe("away");
    }
  });

  it("leave blocks nothing it should not: an invitation that day, and a real check-in wins on the week", async () => {
    const booked = await (await as("member")).rpc("save_meeting", {
      p_id: NO_ID, p: { title: `${TAG} on leave day`, starts_at: `${leaveDay}T08:00:00Z`, ends_at: `${leaveDay}T08:30:00Z`, attendee_ids: [PERSON] },
    });
    expect(booked.error).toBeNull();
    meetings.push(booked.data!);
    expect(await notes(PERSON, "meeting_invite", { meeting_id: booked.data! })).toBe(1);

    await checkInWifi(PERSON, { p_now: cairoInstant(leaveDay, "10:05").toISOString() });
    await closeOpen(PERSON);
    const cell = (await week("member", leaveDay)).find((r) => r.user_id === PERSON)!;
    expect(cell).toMatchObject({ kind: "branch", branch_id: BRANCH_HQ });
  });

  it.skipIf(!isWorkingDay(today))("work from home needs an approved request for today, then the home check-in works", async () => {
    await closeOpen(PERSON);
    const { data: type } = await svc.from("request_types").select("id").eq("key", "work_from_home").single();
    await svc.from("requests").delete().eq("requester_id", PERSON).eq("type_id", type!.id).eq("starts_on", today);
    const home = { p_method: "home", p_lat: 30.05, p_lng: 31.24, p_accuracy_m: 30 };
    const refused = await svc.rpc("check_in", { p_user_id: PERSON, ...home } as never);
    expect(refused.error?.message).toContain("no_wfh_today");

    const { data: id, error } = await (await as("member2")).rpc("submit_request", { type_key: "work_from_home", data: { starts_on: today, ends_on: today } });
    expect(error).toBeNull();
    requests.push(id!);
    // Pending is not enough.
    expect((await svc.rpc("check_in", { p_user_id: PERSON, ...home } as never)).error?.message).toContain("no_wfh_today");
    await approveAll(id!);
    await checkIn(PERSON, home);
    const { data: inside } = await (await as("member")).rpc("who_is_in", {});
    expect(inside!.find((r) => r.user_id === PERSON)).toMatchObject({ method: "home", branch_id: null });
    // Home is not a branch floor.
    expect((await (await as("member2")).rpc("map_move", { p_branch_id: BRANCH_HQ, p_x: 4, p_y: 4 })).error?.message).toContain("not_checked_in");
  });

  it("the night-time check-out closes an open session, tells the person and clears the map", async () => {
    const id = await checkInWifi(PERSON);
    expect((await (await as("member2")).rpc("map_move", { p_branch_id: BRANCH_HQ, p_x: 6, p_y: 7 })).data).toBe(true);
    const night = cairoInstant(cairoDateString(new Date()), "23:30").toISOString();
    expect((await svc.rpc("cron_auto_checkout", { p_now: night })).error).toBeNull();
    const { data: s } = await svc.from("attendance_sessions").select("checked_in_at, checked_out_at, auto_closed").eq("id", id).single();
    expect(s!.auto_closed).toBe(true);
    expect(s!.checked_out_at).not.toBeNull();
    expect(await notes(PERSON, "auto_checkout", { session_id: id })).toBe(1);
    expect((await svc.from("map_positions").select("user_id").eq("user_id", PERSON)).data).toEqual([]);
    // The person may then confirm the real time.
    const out = s!.checked_in_at;
    expect((await (await as("member2")).rpc("confirm_auto_checkout", { p_session_id: id, p_actual_out: out })).error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("scenario: celebrations and the map", () => {
  const RECIPIENT = U.member2;
  const kudos: string[] = [];
  let saved: { birth_month: number | null; birth_day: number | null; celebrate: boolean } | null = null;
  const [, month, dayOfMonth] = today.split("-").map(Number);
  const onceKeys = [`celebrate:birthday:${RECIPIENT}:${today}`, `celebrate:anniversary:${RECIPIENT}:${today}`];

  beforeAll(async () => {
    const { data } = await svc.from("profiles").select("birth_month, birth_day, celebrate").eq("id", RECIPIENT).single();
    saved = data;
    await svc.from("cron_log").delete().in("key", onceKeys);
  });

  afterAll(async () => {
    if (saved) await svc.from("profiles").update(saved).eq("id", RECIPIENT);
    await svc.from("cron_log").delete().in("key", onceKeys);
    for (const id of kudos) await svc.from("notifications").delete().eq("data->>kudos_id", id);
    if (kudos.length) await svc.from("kudos").delete().in("id", kudos);
    await svc.from("notifications").delete().in("kind", ["happy_birthday", "celebration_birthday", "map_invite"]).gte("created_at", START);
    await svc.from("map_interactions").delete().eq("from_id", RECIPIENT);
    await closeOpen(RECIPIENT);
    await closeOpen(U.member);
  });

  /** A client of its own for listening, so the shared cached clients keep no channels. */
  async function fresh(user: User) {
    const client = anon();
    const { error } = await client.auth.signInWithPassword({ email: EMAIL[user], password: PASSWORD });
    if (error) throw error;
    return client;
  }

  async function listen(client: Client, event: string) {
    const { data } = await client.auth.getSession();
    await client.realtime.setAuth(data.session!.access_token);
    const received: unknown[] = [];
    const channel = client.channel(`branch:${BRANCH_HQ}`, { config: { private: true } });
    channel.on("broadcast", { event }, (msg) => received.push(msg.payload));
    const status = await new Promise<string>((resolve) => {
      const timer = setTimeout(() => resolve("TIMEOUT"), 8000);
      channel.subscribe((s) => {
        if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR") {
          clearTimeout(timer);
          resolve(s);
        }
      });
    });
    // Broadcasts sent in the first moment after joining can be missed; give the join a second.
    if (status === "SUBSCRIBED") await new Promise((r) => setTimeout(r, 1500));
    return { status, received, stop: () => client.removeChannel(channel) };
  }

  it("kudos notify the recipient and celebrate on the floor they are checked in to", async () => {
    await checkInWifi(RECIPIENT);
    const watcher = await listen(await fresh("traffic"), "celebrate");
    expect(watcher.status).toBe("SUBSCRIBED");
    try {
      const { data, error } = await (await as("member")).from("kudos").insert({ to_id: RECIPIENT, badge: "on_time", message: `${TAG} thanks` }).select("id").single();
      expect(error).toBeNull();
      kudos.push(data!.id);
      expect(await notes(RECIPIENT, "kudos", { kudos_id: data!.id, badge: "on_time", by: U.member })).toBe(1);
      await expect.poll(() => watcher.received.length, { timeout: 8000 }).toBeGreaterThan(0);
      expect(watcher.received[0]).toMatchObject({ user_id: RECIPIENT, kind: "kudos", badge: "on_time" });
    } finally {
      await watcher.stop();
    }
    // Every department reads it; a guest does not.
    expect((await (await as("sales")).from("kudos").select("id").eq("id", kudos[0])).data).toHaveLength(1);
    expect((await (await as("guest")).from("kudos").select("id").eq("id", kudos[0])).data).toEqual([]);
  });

  it("a requester cannot listen to the branch floor", async () => {
    const sales = await listen(await fresh("sales"), "celebrate");
    await sales.stop();
    expect(sales.status).toBe("CHANNEL_ERROR");
  });

  it("a birthday is announced once to the person and their department, then wishes arrive as kudos", async () => {
    await svc.from("profiles").update({ birth_month: month, birth_day: dayOfMonth, celebrate: true }).eq("id", RECIPIENT);
    for (let i = 0; i < 2; i++) expect((await svc.rpc("cron_celebrations", { p_now: new Date().toISOString() })).error).toBeNull();
    expect(await notes(RECIPIENT, "happy_birthday")).toBe(1);
    expect(await notes(U.member, "celebration_birthday", { user_id: RECIPIENT })).toBe(1);
    expect(await notes(U.traffic, "celebration_birthday", { user_id: RECIPIENT })).toBe(1);
    expect(await notes(U.sales, "celebration_birthday", { user_id: RECIPIENT })).toBe(0);

    const { data: upcoming } = await (await as("sales")).rpc("upcoming_celebrations", { p_from: today, p_days: 0 });
    expect(upcoming!.filter((c) => c.user_id === RECIPIENT).map((c) => c.kind)).toContain("birthday");

    const wish = await (await as("member")).from("kudos").insert({ to_id: RECIPIENT, badge: "birthday", message: `${TAG} happy birthday` }).select("id").single();
    expect(wish.error).toBeNull();
    kudos.push(wish.data!.id);
    expect(await notes(RECIPIENT, "kudos", { kudos_id: wish.data!.id, badge: "birthday" })).toBe(1);

    await svc.from("profiles").update({ celebrate: false }).eq("id", RECIPIENT);
    const { data: hidden } = await (await as("sales")).rpc("upcoming_celebrations", { p_from: today, p_days: 0 });
    expect(hidden!.filter((c) => c.user_id === RECIPIENT)).toEqual([]);
  });

  it("on the floor: moves and greetings need both people checked in at the same branch", async () => {
    await svc.from("map_positions").delete().eq("user_id", RECIPIENT);
    await closeOpen(U.member);
    const member2 = await as("member2");
    expect((await member2.rpc("map_move", { p_branch_id: BRANCH_HQ, p_x: 9, p_y: 9 })).data).toBe(true);
    expect((await member2.rpc("map_interact", { p_to: U.member, p_kind: "coffee" })).error?.message).toContain("not_here");
    await checkInWifi(U.member);
    expect((await member2.rpc("map_interact", { p_to: U.member, p_kind: "coffee" })).error).toBeNull();
    expect(await notes(U.member, "map_invite", { kind: "coffee", by: RECIPIENT })).toBe(1);
    for (const user of ["sales", "guest", "norole", "inactive"] as const) {
      expect((await (await as(user)).rpc("map_move", { p_branch_id: BRANCH_HQ, p_x: 1, p_y: 1 })).error?.code, user).toBe("42501");
      expect((await (await as(user)).rpc("map_interact", { p_to: RECIPIENT, p_kind: "wave" })).error?.code, user).toBe("42501");
    }
    // Checking out leaves the floor.
    await closeOpen(RECIPIENT);
    expect((await svc.from("map_positions").select("user_id").eq("user_id", RECIPIENT)).data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("scenario: who may do what across modules", () => {
  const ROLES = ["guest", "sales", "member", "traffic", "admin", "inactive", "norole"] as const;
  type Role = (typeof ROLES)[number];
  const made = { meetings: [] as string[], cards: [] as string[], kudos: [] as string[], shoots: [] as string[] };
  let slot = 0;
  const nextSlot = () => {
    slot += 1;
    const start = new Date(Date.UTC(2031, 8, 1 + slot, 7));
    return { starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 30 * 60_000).toISOString() };
  };

  afterAll(async () => {
    for (const id of made.meetings) await svc.from("notifications").delete().eq("data->>meeting_id", id);
    for (const id of made.cards) await svc.from("notifications").delete().eq("data->>card_id", id);
    for (const id of made.kudos) await svc.from("notifications").delete().eq("data->>kudos_id", id);
    if (made.meetings.length) await svc.from("meetings").delete().in("id", made.meetings);
    if (made.cards.length) await svc.from("cards").delete().in("id", made.cards);
    if (made.kudos.length) await svc.from("kudos").delete().in("id", made.kudos);
    if (made.shoots.length) await svc.from("shoots").delete().in("id", made.shoots);
  });

  const allowed: Record<string, Role[]> = {
    meeting: ["sales", "member", "traffic", "admin"],
    urgent: ["sales"],
    kudos: ["sales", "member", "traffic", "admin"],
    shoot: ["member", "traffic", "admin"],
    week: ["sales", "member", "traffic", "admin"],
    gateMonth: ["sales", "member", "traffic", "admin"],
  };

  it.each(ROLES)("%s", async (role) => {
    const client = await as(role);
    const id = U[role];
    const may = (what: keyof typeof allowed) => allowed[what].includes(role);

    const meeting = await client.rpc("save_meeting", { p_id: NO_ID, p: { title: `${TAG} access ${role}`, ...nextSlot() } });
    if (may("meeting")) {
      expect(meeting.error, "book a meeting").toBeNull();
      made.meetings.push(meeting.data!);
    } else expect(meeting.error, "book a meeting").not.toBeNull();

    const urgent = await client.rpc("submit_urgent_request", { payload: { ...line(`${TAG} access ${role}`), urgent_reason: "Access check" } });
    if (may("urgent")) {
      expect(urgent.error, "urgent request").toBeNull();
      made.cards.push(urgent.data!);
    } else expect(urgent.error, "urgent request").not.toBeNull();

    const peer = role === "member" ? U.member2 : U.member;
    const k = await client.from("kudos").insert({ to_id: peer, message: `${TAG} access` }).select("id").single();
    if (may("kudos")) {
      expect(k.error, "kudos").toBeNull();
      made.kudos.push(k.data!.id);
    } else expect(k.error, "kudos").not.toBeNull();

    const s = await client.from("shoots").insert({ title: `${TAG} access ${role}`, shoot_on: "2031-09-20", branch_id: BRANCH_HQ, created_by: id }).select("id").single();
    if (may("shoot")) {
      expect(s.error, "plan a shoot").toBeNull();
      made.shoots.push(s.data!.id);
    } else expect(s.error?.code, "plan a shoot").toBe("42501");

    const w = await client.rpc("team_week", { p_from: "2031-09-20", p_to: "2031-09-20" });
    expect(w.error).toBeNull();
    if (may("week")) expect(w.data!.length, "team week").toBeGreaterThan(0);
    else expect(w.data, "team week").toEqual([]);

    const g = await client.rpc("ensure_gate_month", { p_month: monthAt(0) });
    if (may("gateMonth")) expect(g.error, "open gates").toBeNull();
    else expect(g.error?.code, "open gates").toBe("42501");

    // Nobody signed in calls check_in or the scheduled jobs.
    expect((await client.rpc("check_in", { p_user_id: id, p_method: "wifi", p_branch_id: BRANCH_HQ, ...HQ })).error, "check_in").not.toBeNull();
    for (const job of ["cron_meetings", "cron_gates", "cron_celebrations", "cron_auto_checkout", "cron_workflow_daily", "cron_shoots"] as const) {
      expect((await client.rpc(job, {})).error, job).not.toBeNull();
    }
  });

  it("signed-out visitors reach nothing", async () => {
    const visitor = anon();
    expect((await visitor.rpc("save_meeting", { p_id: NO_ID, p: { title: "x", ...nextSlot() } })).error).not.toBeNull();
    expect((await visitor.rpc("team_week", { p_from: "2031-09-20", p_to: "2031-09-20" })).error).not.toBeNull();
    expect((await visitor.from("kudos").select("id")).data ?? []).toEqual([]);
    expect((await visitor.from("cards").select("id")).data ?? []).toEqual([]);
  });

  it("an inactive person reads only their own profile", async () => {
    const inactive = await as("inactive");
    const { data } = await inactive.from("profiles").select("id");
    expect(data!.map((p) => p.id)).toEqual([U.inactive]);
    for (const table of ["cards", "meetings", "gate_items", "kudos", "shoots", "notifications"] as const) {
      expect((await inactive.from(table).select("id").limit(1)).data ?? [], table).toEqual([]);
    }
  });
});
