import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getMyDay } from "@/features/my-day/queries";
import { runDailyDigest } from "@/lib/email/digest";
import { flushPushQueue, type PushSender, type StoredSubscription } from "@/lib/push/send";
import { anon, as, assign, makePipelineCard, service, U } from "./helpers";

const svc = service();
const endpoint = () => `https://fcm.googleapis.com/fcm/send/w13-${randomUUID()}`;
const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz", auth: "tBHItJI5svbpez7KI4CCXg" };

describe("push_subscriptions", () => {
  it("lets the owner add, read and remove their device", async () => {
    const member = await as("member");
    const url = endpoint();
    const { error } = await member.from("push_subscriptions").insert({ user_id: U.member, endpoint: url, ...keys });
    expect(error).toBeNull();
    const { data } = await member.from("push_subscriptions").select("endpoint").eq("endpoint", url);
    expect(data).toHaveLength(1);
    await member.from("push_subscriptions").delete().eq("endpoint", url);
    const { data: after } = await svc.from("push_subscriptions").select("id").eq("endpoint", url);
    expect(after).toHaveLength(0);
  });

  it("works for portal users too", async () => {
    const sales = await as("sales");
    const url = endpoint();
    expect((await sales.from("push_subscriptions").insert({ user_id: U.sales, endpoint: url, ...keys })).error).toBeNull();
    await sales.from("push_subscriptions").delete().eq("endpoint", url);
  });

  it("hides a device from everyone else and refuses their changes", async () => {
    const url = endpoint();
    await svc.from("push_subscriptions").insert({ user_id: U.member, endpoint: url, ...keys });
    for (const user of ["member2", "admin", "hr"] as const) {
      const other = await as(user);
      const { data } = await other.from("push_subscriptions").select("id").eq("endpoint", url);
      expect(data, user).toHaveLength(0);
      await other.from("push_subscriptions").delete().eq("endpoint", url);
    }
    const { data: still } = await svc.from("push_subscriptions").select("id").eq("endpoint", url);
    expect(still).toHaveLength(1);
    await svc.from("push_subscriptions").delete().eq("endpoint", url);
  });

  it("refuses a device registered in someone else's name", async () => {
    const member2 = await as("member2");
    const { error } = await member2.from("push_subscriptions").insert({ user_id: U.member, endpoint: endpoint(), ...keys });
    expect(error).not.toBeNull();
  });

  it("refuses updates, even by the owner", async () => {
    const url = endpoint();
    await svc.from("push_subscriptions").insert({ user_id: U.member, endpoint: url, ...keys });
    const member = await as("member");
    const { error } = await member.from("push_subscriptions").update({ auth: "changed" }).eq("endpoint", url);
    expect(error).not.toBeNull();
    await svc.from("push_subscriptions").delete().eq("endpoint", url);
  });

  it("refuses anonymous visitors", async () => {
    const { error } = await anon().from("push_subscriptions").insert({ user_id: U.member, endpoint: endpoint(), ...keys });
    expect(error).not.toBeNull();
  });
});

describe("notification_preferences", () => {
  afterAll(async () => {
    await svc.from("notification_preferences").delete().in("user_id", [U.community, U.approver]);
  });

  it("lets the owner save and read their choices", async () => {
    const community = await as("community");
    const saved = await community
      .from("notification_preferences")
      .upsert({ user_id: U.community, digest_email: false }, { onConflict: "user_id" });
    expect(saved.error).toBeNull();
    const { data } = await community.from("notification_preferences").select("digest_email, push_enabled").eq("user_id", U.community).single();
    expect(data).toEqual({ digest_email: false, push_enabled: true });
  });

  it("works for portal users too", async () => {
    const approver = await as("approver");
    const { error } = await approver.from("notification_preferences").upsert({ user_id: U.approver, push_enabled: false }, { onConflict: "user_id" });
    expect(error).toBeNull();
  });

  it("hides choices from others and refuses their changes", async () => {
    await svc.from("notification_preferences").upsert({ user_id: U.community, digest_email: false }, { onConflict: "user_id" });
    const admin = await as("admin");
    const { data } = await admin.from("notification_preferences").select("user_id").eq("user_id", U.community);
    expect(data).toHaveLength(0);
    await admin.from("notification_preferences").update({ digest_email: true }).eq("user_id", U.community);
    const insert = await (await as("member2")).from("notification_preferences").insert({ user_id: U.traffic, digest_email: false });
    expect(insert.error).not.toBeNull();
    const { data: row } = await svc.from("notification_preferences").select("digest_email").eq("user_id", U.community).single();
    expect(row?.digest_email).toBe(false);
  });
});

describe("claim_once", () => {
  const key = `w13-test:${randomUUID()}`;
  afterAll(async () => {
    await svc.from("cron_log" as "settings").delete().eq("key", key);
  });

  it("is refused for signed-in users and anonymous visitors", async () => {
    for (const client of [await as("admin"), await as("member"), anon()]) {
      const { error } = await client.rpc("claim_once", { p_key: key });
      expect(error?.code).toBe("42501");
    }
  });

  it("is true the first time and false on a repeat for the service role", async () => {
    expect((await svc.rpc("claim_once", { p_key: key })).data).toBe(true);
    expect((await svc.rpc("claim_once", { p_key: key })).data).toBe(false);
  });
});

describe("getMyDay against the real schema", () => {
  const date = "2031-03-05"; // A Wednesday.
  const now = new Date("2031-03-05T06:00:00Z"); // 08:00 in Cairo.
  const ids = { meeting: "", dueCard: "", lateCard: "", doneCard: "", gate: "", shoot: "", action: "", step: "", reviewCard: "" };

  beforeAll(async () => {
    const { data: meeting } = await svc
      .from("meetings")
      .insert({ title: "W13 briefing", title_ar: "اجتماع", starts_at: "2031-03-05T08:00:00Z", ends_at: "2031-03-05T08:30:00Z", is_private: true })
      .select("id")
      .single();
    ids.meeting = meeting!.id;
    await svc.from("meeting_attendees").insert({ meeting_id: ids.meeting, user_id: U.member });

    const due = await makePipelineCard("production", { title: "W13 due", due_at: "2031-03-05T12:00:00Z" });
    const late = await makePipelineCard("production", { title: "W13 late", due_at: "2031-03-04T12:00:00Z" });
    const done = await makePipelineCard("published", { title: "W13 done", due_at: "2031-03-04T12:00:00Z" });
    const review = await makePipelineCard("creative_review", { title: "W13 review", due_at: "2031-03-05T12:00:00Z" });
    Object.assign(ids, { dueCard: due.id, lateCard: late.id, doneCard: done.id, reviewCard: review.id });
    await Promise.all([assign(due.id, U.member), assign(late.id, U.member), assign(done.id, U.member), assign(review.id, U.member)]);

    const { data: step } = await svc
      .from("approval_steps")
      .insert({ subject_type: "card", subject_id: review.id, step_index: 0, approver_id: U.member, status: "active" })
      .select("id")
      .single();
    ids.step = step!.id;

    const { data: track } = await svc.from("gate_tracks").select("id").limit(1).single();
    const { data: gate } = await svc
      .from("gate_items")
      .insert({ month: "2031-03-01", track_id: track!.id, kind: "gate", name_en: "W13 gate", name_ar: "بوابة", starts_on: date, due_on: "2031-03-08", owner_id: U.member })
      .select("id")
      .single();
    ids.gate = gate!.id;

    const { data: shoot } = await svc.from("shoots").insert({ title: "W13 shoot", shoot_on: "2031-03-06", location_name: "Studio" }).select("id").single();
    ids.shoot = shoot!.id;
    await svc.from("shoot_crew").insert({ shoot_id: ids.shoot, user_id: U.member, role: "Camera" });

    const { data: action } = await svc
      .from("meeting_actions")
      .insert({ meeting_id: ids.meeting, title: "W13 action", assignee_id: U.member, created_by: U.member })
      .select("id")
      .single();
    ids.action = action!.id;
  });

  afterAll(async () => {
    await svc.from("approval_steps").delete().eq("id", ids.step);
    await svc.from("shoots").delete().eq("id", ids.shoot);
    await svc.from("gate_items").delete().eq("id", ids.gate);
    await svc.from("meetings").delete().eq("id", ids.meeting);
    await svc.from("cards").delete().in("id", [ids.dueCard, ids.lateCard, ids.doneCard, ids.reviewCard]);
  });

  const expectMine = (day: Awaited<ReturnType<typeof getMyDay>>) => {
    expect(day.meetings.items.map((m) => m.id)).toContain(ids.meeting);
    const cards = day.cards.items.map((c) => c.id);
    expect(cards).toEqual(expect.arrayContaining([ids.dueCard, ids.lateCard]));
    expect(cards).not.toContain(ids.doneCard); // Published.
    expect(cards).not.toContain(ids.reviewCard); // Already in the approvals section.
    expect(day.cards.items.find((c) => c.id === ids.lateCard)?.overdue).toBe(true);
    expect(day.approvals.items.map((a) => a.stepId)).toContain(ids.step);
    expect(day.gates.items.find((g) => g.id === ids.gate)?.daysLeft).toBe(3);
    expect(day.shoots.items.find((s) => s.id === ids.shoot)).toMatchObject({ when: "tomorrow", callTime: "09:00" });
    expect(day.actions.items.map((a) => a.id)).toContain(ids.action);
  };

  it("loads every section for the signed-in person", async () => {
    const day = await getMyDay(await as("member"), U.member, date, { now });
    expect(Object.values(day).every((s) => s.ok)).toBe(true);
    expectMine(day);
  });

  it("loads the same briefing with the service role, for the digest", async () => {
    const day = await getMyDay(svc, U.member, date, { now, celebrations: [] });
    expect(Object.values(day).every((s) => s.ok)).toBe(true);
    expectMine(day);
  });

  it("never gives one person's items to another, even with the service role", async () => {
    const day = await getMyDay(svc, U.member2, date, { now, celebrations: [] });
    expect(day.meetings.items.map((m) => m.id)).not.toContain(ids.meeting);
    expect(day.cards.items.map((c) => c.id)).not.toContain(ids.dueCard);
    expect(day.approvals.items.map((a) => a.stepId)).not.toContain(ids.step);
    expect(day.gates.items.map((g) => g.id)).not.toContain(ids.gate);
    expect(day.shoots.items.map((s) => s.id)).not.toContain(ids.shoot);
    expect(day.actions.items.map((a) => a.id)).not.toContain(ids.action);
  });

  it("drops a meeting once the person declines it", async () => {
    await svc.from("meeting_attendees").update({ response: "declined" }).eq("meeting_id", ids.meeting).eq("user_id", U.member);
    const day = await getMyDay(svc, U.member, date, { now, celebrations: [] });
    expect(day.meetings.items.map((m) => m.id)).not.toContain(ids.meeting);
    await svc.from("meeting_attendees").update({ response: "pending" }).eq("meeting_id", ids.meeting).eq("user_id", U.member);
  });

  describe("runDailyDigest", () => {
    const keyLike = `digest:%:${date}`;
    const resendKey = process.env.RESEND_API_KEY;

    beforeAll(async () => {
      delete process.env.RESEND_API_KEY; // Previews only: tests never send email.
      vi.spyOn(console, "info").mockImplementation(() => {});
      await svc.from("notification_preferences").upsert({ user_id: U.member2, digest_email: false }, { onConflict: "user_id" });
    });

    afterAll(async () => {
      if (resendKey) process.env.RESEND_API_KEY = resendKey;
      vi.restoreAllMocks();
      await svc.from("notification_preferences").delete().eq("user_id", U.member2);
      await svc.from("cron_log" as "settings").delete().like("key", keyLike);
    });

    it("does nothing outside the digest hour", async () => {
      expect((await runDailyDigest(new Date("2031-03-05T03:00:00Z"))).due).toBe(false);
    });

    it("does nothing on a Friday", async () => {
      expect((await runDailyDigest(new Date("2031-03-07T06:00:00Z"))).due).toBe(false);
    });

    it("sends once per person, honours the opt-out and logs no personal data", async () => {
      const first = await runDailyDigest(now);
      expect(first.due).toBe(true);
      expect(first.sent).toBeGreaterThan(0);

      const lines = vi.mocked(console.info).mock.calls.map((c) => String(c[0]));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) expect(line).toMatch(/^\[digest preview\] locale=(en|ar) items=\d+$/);

      const claimed = async (user: string) =>
        (await svc.from("cron_log" as "settings").select("key").eq("key", `digest:${user}:${date}`)).data ?? [];
      expect(await claimed(U.member)).toHaveLength(1);
      expect(await claimed(U.member2)).toHaveLength(0); // Opted out.
      expect(await claimed(U.guest)).toHaveLength(0); // Guests are not staff.
      expect(await claimed(U.inactive)).toHaveLength(0);

      const second = await runDailyDigest(now);
      expect(second.sent).toBe(0);
      expect(second.repeated).toBeGreaterThan(0);
    }, 120_000);
  });
});

describe("flushPushQueue", () => {
  const made = { subs: [] as string[], notes: [] as string[] };

  async function subscribe(user: string, url = endpoint()) {
    const { data } = await svc.from("push_subscriptions").insert({ user_id: user, endpoint: url, ...keys }).select("id").single();
    made.subs.push(data!.id);
    return { id: data!.id, url };
  }

  async function notify(user: string, createdAt?: string) {
    const { data } = await svc
      .from("notifications")
      .insert({ user_id: user, kind: "meeting_soon", link: "/meetings/1", data: { title: "W13 push" }, ...(createdAt ? { created_at: createdAt } : {}) })
      .select("id")
      .single();
    made.notes.push(data!.id);
    return data!.id;
  }

  /** Other suites share the queue, so keep flushing until this row has been claimed. */
  async function drain(id: string, sender: PushSender) {
    for (let i = 0; i < 20; i++) {
      await flushPushQueue(sender);
      const { data } = await svc.from("notifications").select("pushed_at").eq("id", id).single();
      if (data?.pushed_at) return data.pushed_at;
    }
    throw new Error("notification was not claimed");
  }

  afterAll(async () => {
    await svc.from("push_subscriptions").delete().in("id", made.subs);
    await svc.from("notifications").delete().in("id", made.notes);
    await svc.from("notification_preferences").delete().eq("user_id", U.traffic);
  });

  it("does nothing without VAPID keys and leaves the queue untouched", async () => {
    const id = await notify(U.community);
    const run = await flushPushQueue(null);
    expect(run).toMatchObject({ configured: false, claimed: 0 });
    const { data } = await svc.from("notifications").select("pushed_at").eq("id", id).single();
    expect(data?.pushed_at).toBeNull();
  });

  it("delivers once, removes dead subscriptions and does not retry failures", async () => {
    const live = await subscribe(U.member);
    const dead = await subscribe(U.member);
    const broken = await subscribe(U.member);
    const calls: { sub: StoredSubscription; payload: string }[] = [];
    const sender: PushSender = async (sub, payload) => {
      calls.push({ sub, payload });
      if (sub.id === dead.id) return "gone";
      return sub.id === broken.id ? "failed" : "sent";
    };

    const id = await notify(U.member);
    await drain(id, sender);

    const mine = calls.filter((c) => JSON.parse(c.payload).tag === id);
    expect(mine.map((c) => c.sub.id)).toEqual(expect.arrayContaining([live.id, broken.id]));
    // Earlier notifications in the same run may already have found the dead one.
    expect(calls.some((c) => c.sub.id === dead.id)).toBe(true);
    expect(JSON.parse(mine[0].payload)).toMatchObject({ body: "“W13 push” starts in 15 minutes", link: "/en/meetings/1" });

    const { data: left } = await svc.from("push_subscriptions").select("id, last_used_at").in("id", [live.id, dead.id, broken.id]);
    expect(left?.map((s) => s.id)).not.toContain(dead.id);
    expect(left?.find((s) => s.id === live.id)?.last_used_at).not.toBeNull();

    calls.length = 0;
    await flushPushQueue(sender);
    expect(calls.filter((c) => JSON.parse(c.payload).tag === id)).toHaveLength(0);
  });

  it("sends nothing when the person turned phone notifications off", async () => {
    await svc.from("notification_preferences").upsert({ user_id: U.traffic, push_enabled: false }, { onConflict: "user_id" });
    await subscribe(U.traffic);
    const seen: string[] = [];
    const id = await notify(U.traffic);
    await drain(id, async (_sub, payload) => {
      seen.push(JSON.parse(payload).tag);
      return "sent";
    });
    expect(seen).not.toContain(id);
  });

  it("skips notifications older than an hour", async () => {
    const id = await notify(U.community, new Date(Date.now() - 2 * 3600_000).toISOString());
    await flushPushQueue(async () => "sent");
    const { data } = await svc.from("notifications").select("pushed_at").eq("id", id).single();
    expect(data?.pushed_at).toBeNull();
  });

  it("never double-sends when two runs overlap", async () => {
    await subscribe(U.leadCreative);
    const id = await notify(U.leadCreative);
    let sends = 0;
    const sender: PushSender = async (_sub, payload) => {
      if (JSON.parse(payload).tag === id) sends++;
      return "sent";
    };
    await Promise.all([flushPushQueue(sender), flushPushQueue(sender)]);
    await drain(id, sender);
    expect(sends).toBe(1);
  });

  it("refuses to post to an address outside the push services", async () => {
    const stray = await subscribe(U.leadPerformance, `https://intranet.test/${randomUUID()}`);
    const hit: string[] = [];
    const id = await notify(U.leadPerformance);
    await drain(id, async (sub) => {
      hit.push(sub.endpoint);
      return "sent";
    });
    expect(hit).not.toContain(stray.url);
    const { data } = await svc.from("push_subscriptions").select("id").eq("id", stray.id);
    expect(data).toHaveLength(0);
  });
});
