import { beforeEach, describe, expect, it } from "vitest";
import { as, BRANCH_HQ, service, U } from "./helpers";

const svc = service();

async function closeOpen(userId: string) {
  const { data } = await svc.from("attendance_sessions").select("id, checked_in_at").eq("user_id", userId).is("checked_out_at", null);
  for (const s of data ?? []) {
    const out = new Date(Math.max(Date.now(), Date.parse(s.checked_in_at) + 1000)).toISOString(); // host and DB clocks may differ slightly
    await svc.from("attendance_sessions").update({ checked_out_at: out }).eq("id", s.id);
  }
}

async function checkIn(userId: string, method: "wifi" | "qr" | "field" | "home", at?: string) {
  return svc.rpc("check_in", {
    p_user_id: userId,
    p_method: method,
    p_branch_id: method === "wifi" || method === "qr" ? BRANCH_HQ : (null as unknown as string),
    p_verify: { test: true },
    ...(at ? { p_now: at } : {}),
  });
}

describe("check-in", () => {
  beforeEach(async () => {
    await closeOpen(U.member);
    await closeOpen(U.member2);
  });

  it("authenticated users cannot call check_in directly", async () => {
    const { error } = await (await as("member")).rpc("check_in", { p_user_id: U.member, p_method: "wifi", p_branch_id: BRANCH_HQ });
    expect(error).not.toBeNull();
  });

  it("allows one open session per user", async () => {
    expect((await checkIn(U.member, "wifi")).error).toBeNull();
    const second = await checkIn(U.member, "qr");
    expect(second.error?.message).toContain("already_checked_in");
  });

  it("marks lateness at the boundary minute in Cairo time", async () => {
    // Monday 12 Oct 2026, Cairo is UTC+3; schedule 10:00 + 15 minutes grace.
    const onTime = await checkIn(U.member2, "wifi", "2026-10-12T07:15:00Z");
    expect(onTime.error).toBeNull();
    let { data } = await svc.from("attendance_sessions").select("is_late").eq("id", onTime.data!).single();
    expect(data?.is_late).toBe(false);
    await closeOpen(U.member2);
    const late = await checkIn(U.member2, "wifi", "2026-10-12T07:16:00Z");
    ({ data } = await svc.from("attendance_sessions").select("is_late").eq("id", late.data!).single());
    expect(data?.is_late).toBe(true);
  });

  it("is never late on a day off (Friday)", async () => {
    const r = await checkIn(U.member2, "wifi", "2026-10-16T09:00:00Z");
    const { data } = await svc.from("attendance_sessions").select("is_late").eq("id", r.data!).single();
    expect(data?.is_late).toBe(false);
  });

  it("home check-in needs an approved work-from-home request today", async () => {
    expect((await checkIn(U.member, "home")).error?.message).toContain("no_wfh_today");
    const { data: type } = await svc.from("request_types").select("id").eq("key", "work_from_home").single();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
    await svc.from("requests").insert({ type_id: type!.id, requester_id: U.member, status: "approved", starts_on: today, ends_on: today, data: {} });
    expect((await checkIn(U.member, "home")).error).toBeNull();
  });

  it("field check-in needs no verification; check_out closes it", async () => {
    expect((await checkIn(U.member, "field")).error).toBeNull();
    expect((await (await as("member")).rpc("check_out")).error).toBeNull();
    const { data } = await svc.from("attendance_sessions").select("id").eq("user_id", U.member).is("checked_out_at", null);
    expect(data).toEqual([]);
  });
});

describe("who is in and attendance visibility", () => {
  it("marketing users see who is in; requesters don't", async () => {
    await closeOpen(U.member);
    await checkIn(U.member, "wifi");
    const { data: seen } = await (await as("member2")).rpc("who_is_in", {});
    expect(seen!.some((s) => s.user_id === U.member)).toBe(true);
    expect(Object.keys(seen![0])).not.toContain("is_late");
    const { data: none } = await (await as("sales")).rpc("who_is_in", {});
    expect(none).toEqual([]);
  });

  it("sessions are visible to the person, their team lead, hr and leadership only", async () => {
    const count = async (u: Parameters<typeof as>[0]) =>
      ((await (await as(u)).from("attendance_sessions").select("id").eq("user_id", U.member)).data ?? []).length;
    expect(await count("member")).toBeGreaterThan(0);
    expect(await count("leadCreative")).toBeGreaterThan(0);
    expect(await count("hr")).toBeGreaterThan(0);
    expect(await count("leadership")).toBeGreaterThan(0);
    expect(await count("member2")).toBe(0);
    expect(await count("traffic")).toBe(0);
  });

  it("nobody writes sessions directly", async () => {
    const { error } = await (await as("member")).from("attendance_sessions").insert({ user_id: U.member, method: "manual" });
    expect(error).not.toBeNull();
  });
});

describe("auto check-out", () => {
  beforeEach(async () => {
    await closeOpen(U.community);
  });

  async function sessionAt(inAt: string) {
    const r = await checkIn(U.community, "wifi", inAt);
    expect(r.error).toBeNull();
    return r.data!;
  }
  const closedAt = async (id: string) => (await svc.from("attendance_sessions").select("checked_out_at, auto_closed").eq("id", id).single()).data!;

  it("closes yesterday's session at the scheduled end", async () => {
    const id = await sessionAt("2026-10-12T06:30:00Z"); // 09:30 Cairo
    await svc.rpc("cron_auto_checkout", { p_now: "2026-10-13T09:00:00Z" });
    const s = await closedAt(id);
    expect(s.auto_closed).toBe(true);
    expect(new Date(s.checked_out_at!).toISOString()).toBe("2026-10-12T15:00:00.000Z"); // 18:00 Cairo (UTC+3)
  });

  it("a session started after 18:00 closes at its check-in time", async () => {
    const id = await sessionAt("2026-10-12T17:00:00Z"); // 20:00 Cairo
    await svc.rpc("cron_auto_checkout", { p_now: "2026-10-12T20:30:00Z" }); // 23:30 Cairo
    expect(new Date((await closedAt(id)).checked_out_at!).toISOString()).toBe("2026-10-12T17:00:00.000Z");
  });

  it("leaves today's sessions open before 23:00 Cairo", async () => {
    const id = await sessionAt("2026-10-12T06:30:00Z");
    await svc.rpc("cron_auto_checkout", { p_now: "2026-10-12T19:30:00Z" }); // 22:30 Cairo
    expect((await closedAt(id)).checked_out_at).toBeNull();
  });

  it("handles both sides of Egypt's summer-time change", async () => {
    // Summer time ends at the end of Thursday 29 Oct 2026: UTC+3 before, UTC+2 after.
    const before = await sessionAt("2026-10-29T06:00:00Z");
    await svc.rpc("cron_auto_checkout", { p_now: "2026-10-30T10:00:00Z" });
    expect(new Date((await closedAt(before)).checked_out_at!).toISOString()).toBe("2026-10-29T15:00:00.000Z");
    await closeOpen(U.community);
    const after = await sessionAt("2026-10-31T07:00:00Z");
    await svc.rpc("cron_auto_checkout", { p_now: "2026-11-01T10:00:00Z" });
    expect(new Date((await closedAt(after)).checked_out_at!).toISOString()).toBe("2026-10-31T16:00:00.000Z");
  });

  it("the owner confirms the real time; others cannot", async () => {
    const id = await sessionAt("2026-10-11T06:00:00Z");
    await svc.rpc("cron_auto_checkout", { p_now: "2026-10-12T09:00:00Z" });
    const other = await (await as("member")).rpc("confirm_auto_checkout", { p_session_id: id, p_actual_out: "2026-10-11T14:00:00Z" });
    expect(other.error?.code).toBe("42501");
    const mine = await (await as("community")).rpc("confirm_auto_checkout", { p_session_id: id, p_actual_out: "2026-10-11T14:00:00Z" });
    expect(mine.error).toBeNull();
    const { data: edits } = await svc.from("attendance_edits").select("new_out").eq("session_id", id);
    expect(edits).toHaveLength(1);
  });
});

describe("realtime branch channels", () => {
  async function subscribe(user: Parameters<typeof as>[0]) {
    const client = await as(user);
    const { data } = await client.auth.getSession();
    await client.realtime.setAuth(data.session!.access_token);
    return new Promise<string>((resolve) => {
      const ch = client.channel(`branch:${BRANCH_HQ}`, { config: { private: true } });
      const timer = setTimeout(() => resolve("TIMEOUT"), 8000);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR") {
          clearTimeout(timer);
          client.removeChannel(ch);
          resolve(status);
        }
      });
    });
  }

  it("marketing users can subscribe; requesters cannot", async () => {
    expect(await subscribe("member")).toBe("SUBSCRIBED");
    expect(await subscribe("sales")).toBe("CHANNEL_ERROR");
  });
});
