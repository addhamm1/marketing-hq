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

// The hq test branch point (supabase/seed/01_core.sql) and its 150 m radius.
const HQ = { lat: 30.096, lng: 31.326 };
const at = (lat: number, lng: number, accuracy = 10) => ({ p_lat: lat, p_lng: lng, p_accuracy_m: accuracy });

async function checkIn(userId: string, method: "wifi" | "qr" | "field" | "home", when?: string) {
  return svc.rpc("check_in", {
    p_user_id: userId,
    p_method: method,
    ...(method === "wifi" || method === "qr" ? { p_branch_id: BRANCH_HQ } : {}),
    ...(method === "field" ? at(HQ.lat + 0.1, HQ.lng) : at(HQ.lat, HQ.lng)),
    p_verify: { test: true },
    ...(when ? { p_now: when } : {}),
  });
}

const gps = (userId: string, lat: number, lng: number, accuracy = 10) =>
  svc.rpc("check_in", { p_user_id: userId, p_method: "gps", ...at(lat, lng, accuracy) });

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
    const second = await gps(U.member, HQ.lat, HQ.lng);
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
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
    const { data: type } = await svc.from("request_types").select("id").eq("key", "work_from_home").single();
    // A rerun on the same day would find the request inserted below.
    const del = await svc.from("requests").delete().eq("requester_id", U.member).eq("type_id", type!.id).eq("starts_on", today);
    expect(del.error).toBeNull();
    expect((await checkIn(U.member, "home")).error?.message).toContain("no_wfh_today");
    await svc.from("requests").insert({ type_id: type!.id, requester_id: U.member, status: "approved", starts_on: today, ends_on: today, data: {} });
    expect((await checkIn(U.member, "home")).error).toBeNull();
  });

  it("field check-in records the location and place; check_out closes it", async () => {
    const r = await svc.rpc("check_in", {
      p_user_id: U.member, p_method: "field", ...at(30.0444, 31.2357, 35), p_place: "  Client office – Zayed  ",
    });
    expect(r.error).toBeNull();
    const { data: s } = await svc.from("attendance_sessions").select("branch_id, checkin_lat, checkin_accuracy_m, checkin_place").eq("id", r.data!).single();
    expect(s).toEqual({ branch_id: null, checkin_lat: 30.0444, checkin_accuracy_m: 35, checkin_place: "Client office – Zayed" });
    expect((await (await as("member")).rpc("check_out", { p_lat: 30.0444, p_lng: 31.2357, p_accuracy_m: 20 })).error).toBeNull();
    const { data } = await svc.from("attendance_sessions").select("id").eq("user_id", U.member).is("checked_out_at", null);
    expect(data).toEqual([]);
  });

  it("every check-in method requires a location", async () => {
    for (const method of ["field", "home", "wifi", "gps"] as const) {
      const r = await svc.rpc("check_in", { p_user_id: U.member, p_method: method, p_branch_id: BRANCH_HQ });
      expect(r.error?.message, method).toContain("location_required");
    }
  });

  it("check-out requires a location and records it", async () => {
    expect((await checkIn(U.member, "wifi")).error).toBeNull();
    const member = await as("member");
    const refused = await member.rpc("check_out", { p_lat: null as never, p_lng: null as never, p_accuracy_m: null as never });
    expect(refused.error?.message).toContain("location_required");
    expect((await member.rpc("check_out", at(HQ.lat, HQ.lng, 15))).error).toBeNull();
    const { data } = await svc.from("attendance_sessions").select("checkout_lat, checkout_accuracy_m")
      .eq("user_id", U.member).order("checked_in_at", { ascending: false }).limit(1).single();
    expect(data).toEqual({ checkout_lat: HQ.lat, checkout_accuracy_m: 15 });
  });

  it("a branch nobody has confirmed uses a wide geofence", async () => {
    await svc.from("branches").update({ location_confirmed_at: null }).eq("id", BRANCH_HQ);
    try {
      // About 500 m north of hq: refused once the point is confirmed, accepted before.
      expect((await gps(U.member, HQ.lat + 0.0045, HQ.lng)).error).toBeNull();
    } finally {
      await svc.from("branches").update({ location_confirmed_at: new Date().toISOString() }).eq("id", BRANCH_HQ);
    }
  });

  it("the retired QR method is refused", async () => {
    expect((await checkIn(U.member, "qr")).error?.message).toContain("method_not_allowed");
  });
});

describe("location (gps) check-in", () => {
  beforeEach(async () => {
    await closeOpen(U.member);
  });

  it("checks in at the nearest branch inside its geofence and records distance", async () => {
    // About 100 m north of hq.
    const r = await gps(U.member, HQ.lat + 0.0009, HQ.lng);
    expect(r.error).toBeNull();
    const { data } = await svc.from("attendance_sessions").select("branch_id, method, distance_m, checkin_accuracy_m").eq("id", r.data!).single();
    expect(data?.branch_id).toBe(BRANCH_HQ);
    expect(data?.method).toBe("gps");
    expect(data?.distance_m).toBeGreaterThan(90);
    expect(data?.distance_m).toBeLessThan(110);
  });

  it("refuses a position out of range and reports the distance", async () => {
    // About 500 m north of hq (no other branch is closer than that).
    const r = await gps(U.member, HQ.lat + 0.0045, HQ.lng);
    expect(r.error?.message).toMatch(/out_of_range:\d+/);
  });

  it("allows for accuracy, capped at 100 m", async () => {
    // About 220 m away: outside 150 m, inside 150 + 80.
    expect((await gps(U.member, HQ.lat + 0.002, HQ.lng, 10)).error?.message).toContain("out_of_range");
    expect((await gps(U.member, HQ.lat + 0.002, HQ.lng, 80)).error).toBeNull();
    await closeOpen(U.member);
    // About 280 m away: even 190 m accuracy only adds 100 m.
    expect((await gps(U.member, HQ.lat + 0.0025, HQ.lng, 190)).error?.message).toContain("out_of_range");
  });

  it("refuses accuracy worse than 200 m and a missing location", async () => {
    expect((await gps(U.member, HQ.lat, HQ.lng, 250)).error?.message).toContain("low_accuracy");
    const r = await svc.rpc("check_in", { p_user_id: U.member, p_method: "gps" });
    expect(r.error?.message).toContain("location_required");
  });

  it("checks out with the location; members cannot read others' coordinates", async () => {
    expect((await gps(U.member, HQ.lat, HQ.lng)).error).toBeNull();
    const out = await (await as("member")).rpc("check_out", { p_lat: HQ.lat, p_lng: HQ.lng + 0.001, p_accuracy_m: 12 });
    expect(out.error).toBeNull();
    const coords = async (u: Parameters<typeof as>[0]) =>
      (await (await as(u)).from("attendance_sessions").select("checkin_lat, checkout_lng").eq("user_id", U.member).eq("method", "gps")).data ?? [];
    expect((await coords("member")).some((s) => s.checkin_lat === HQ.lat && s.checkout_lng !== null)).toBe(true);
    expect((await coords("hr")).length).toBeGreaterThan(0);
    expect((await coords("admin")).length).toBeGreaterThan(0);
    expect((await coords("leadCreative")).length).toBeGreaterThan(0);
    expect(await coords("member2")).toEqual([]);
    expect(await coords("traffic")).toEqual([]);
  });

  it("who_is_in shows branch, method and place but never coordinates", async () => {
    expect((await gps(U.member, HQ.lat, HQ.lng)).error).toBeNull();
    const { data } = await (await as("member2")).rpc("who_is_in", {});
    const row = data!.find((s) => s.user_id === U.member)!;
    expect(row.method).toBe("gps");
    expect(row.branch_id).toBe(BRANCH_HQ);
    for (const key of Object.keys(row)) expect(key).not.toMatch(/lat|lng|accuracy|distance/);
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
