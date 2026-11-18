import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { as, BRANCH_HQ, service, U } from "./helpers";

// W-16: kudos, upcoming celebrations, and moving and interacting on the map.
const svc = service();

// Users other suites rarely check in, so a parallel run does not disturb them.
const WALKER = U.community;
const COLLEAGUE = U.leadPerformance;
const HQ = { p_lat: 30.096, p_lng: 31.326, p_accuracy_m: 10 };
const NO_TARGET = null as unknown as string; // the generated type marks p_to as required

const cairoToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

const opened: string[] = [];

async function checkOut(userId: string) {
  const { data } = await svc.from("attendance_sessions").select("id, checked_in_at").eq("user_id", userId).is("checked_out_at", null);
  for (const s of data ?? []) {
    const out = new Date(Math.max(Date.now(), Date.parse(s.checked_in_at) + 1000)).toISOString();
    await svc.from("attendance_sessions").update({ checked_out_at: out }).eq("id", s.id);
  }
}

async function checkIn(userId: string, method: "wifi" | "field" = "wifi") {
  await checkOut(userId);
  const { data, error } = await svc.rpc("check_in", {
    p_user_id: userId,
    p_method: method,
    ...(method === "wifi" ? { p_branch_id: BRANCH_HQ } : {}),
    ...(method === "field" ? { ...HQ, p_lat: HQ.p_lat + 0.1 } : HQ),
    p_verify: { test: true },
  });
  if (error) throw error;
  opened.push(data as string);
}

async function clearMap() {
  await svc.from("map_interactions").delete().in("from_id", [WALKER, COLLEAGUE]);
  await svc.from("map_positions").delete().in("user_id", [WALKER, COLLEAGUE]);
  await svc.from("notifications").delete().in("user_id", [WALKER, COLLEAGUE]).eq("kind", "map_invite");
}

describe("kudos", () => {
  const created: string[] = [];

  async function kudosFrom(fromId: string, toId: string) {
    const { data, error } = await svc.from("kudos").insert({ from_id: fromId, to_id: toId, badge: "teamwork", message: "Thank you" }).select("id").single();
    if (error) throw error;
    created.push(data.id);
    return data.id;
  }

  const exists = async (id: string) => (await svc.from("kudos").select("id").eq("id", id).maybeSingle()).data !== null;

  afterAll(async () => {
    await svc.from("notifications").delete().in("user_id", [U.member2, U.member, U.sales]).eq("kind", "kudos");
    if (created.length) await svc.from("kudos").delete().in("id", created);
  });

  it("marketing staff send kudos, and every department reads them", async () => {
    const member = await as("member");
    const { data, error } = await member.from("kudos").insert({ from_id: U.member, to_id: U.member2, badge: "creative", message: "Lovely work" }).select("id").single();
    expect(error).toBeNull();
    created.push(data!.id);
    for (const reader of ["member2", "sales", "hr", "leadership"] as const) {
      const { data: rows } = await (await as(reader)).from("kudos").select("id").eq("id", data!.id);
      expect(rows, reader).toHaveLength(1);
    }
  });

  it("staff in other departments can send too", async () => {
    const { data, error } = await (await as("sales")).from("kudos").insert({ from_id: U.sales, to_id: U.member, badge: "helped", message: "Thanks for the quick turnaround" }).select("id").single();
    expect(error).toBeNull();
    created.push(data!.id);
  });

  it("the sender defaults to the signed-in user", async () => {
    const { data, error } = await (await as("member")).from("kudos").insert({ to_id: U.member2, message: "Thanks" }).select("id, from_id").single();
    expect(error).toBeNull();
    created.push(data!.id);
    expect(data!.from_id).toBe(U.member);
  });

  it("nobody sends kudos as someone else", async () => {
    const { error } = await (await as("member")).from("kudos").insert({ from_id: U.member2, to_id: U.sales, message: "Forged" });
    expect(error).not.toBeNull();
  });

  it("nobody sends kudos to themselves", async () => {
    const { error } = await (await as("member")).from("kudos").insert({ from_id: U.member, to_id: U.member, message: "Well done me" });
    expect(error).not.toBeNull();
  });

  it("guests can neither read nor send", async () => {
    const id = await kudosFrom(U.member, U.member2);
    const guest = await as("guest");
    expect((await guest.from("kudos").select("id").eq("id", id)).data).toEqual([]);
    expect((await guest.from("kudos").insert({ from_id: U.guest, to_id: U.member, message: "Hello" })).error).not.toBeNull();
  });

  it("people with no role read nothing", async () => {
    const id = await kudosFrom(U.member, U.member2);
    expect((await (await as("norole")).from("kudos").select("id").eq("id", id)).data).toEqual([]);
  });

  it("refuses an empty message and one over 280 characters", async () => {
    const member = await as("member");
    expect((await member.from("kudos").insert({ from_id: U.member, to_id: U.member2, message: "   " })).error).not.toBeNull();
    expect((await member.from("kudos").insert({ from_id: U.member, to_id: U.member2, message: "x".repeat(281) })).error).not.toBeNull();
  });

  it("kudos cannot be edited", async () => {
    const id = await kudosFrom(U.member, U.member2);
    const { error } = await (await as("member")).from("kudos").update({ message: "Changed" }).eq("id", id);
    expect(error).not.toBeNull();
  });

  it("the author deletes their own", async () => {
    const id = await kudosFrom(U.member, U.member2);
    const { data } = await (await as("member")).from("kudos").delete().eq("id", id).select("id");
    expect(data).toHaveLength(1);
    expect(await exists(id)).toBe(false);
  });

  it("a super admin deletes anyone's", async () => {
    const id = await kudosFrom(U.member, U.member2);
    const { data } = await (await as("admin")).from("kudos").delete().eq("id", id).select("id");
    expect(data).toHaveLength(1);
    expect(await exists(id)).toBe(false);
  });

  it("the recipient, other staff and team leads cannot delete", async () => {
    const id = await kudosFrom(U.member, U.member2);
    for (const user of ["member2", "sales", "leadCreative", "leadership"] as const) {
      const { data } = await (await as(user)).from("kudos").delete().eq("id", id).select("id");
      expect(data ?? [], user).toEqual([]);
    }
    expect(await exists(id)).toBe(true);
  });
});

describe("upcoming_celebrations", () => {
  let saved: { birth_month: number | null; birth_day: number | null; joined_on: string | null; celebrate: boolean };
  const today = cairoToday();
  const [year, month, day] = today.split("-").map(Number);

  beforeAll(async () => {
    const { data } = await svc.from("profiles").select("birth_month, birth_day, joined_on, celebrate").eq("id", WALKER).single();
    saved = data!;
  });

  beforeEach(async () => {
    const { error } = await svc.from("profiles")
      .update({ birth_month: month, birth_day: day, joined_on: `${year - 3}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, celebrate: true })
      .eq("id", WALKER);
    if (error) throw error;
  });

  afterAll(async () => {
    await svc.from("profiles").update(saved).eq("id", WALKER);
  });

  const mine = async (user: "member" | "sales" | "hr" | "guest" | "norole") => {
    const { data, error } = await (await as(user)).rpc("upcoming_celebrations", { p_from: today, p_days: 0 });
    expect(error).toBeNull();
    return (data ?? []).filter((c) => c.user_id === WALKER);
  };

  it("staff in any department see birthdays and anniversaries", async () => {
    for (const user of ["member", "sales", "hr"] as const) {
      expect((await mine(user)).map((c) => c.kind).sort(), user).toEqual(["anniversary", "birthday"]);
    }
  });

  it("counts the years of an anniversary", async () => {
    expect((await mine("member")).find((c) => c.kind === "anniversary")?.years).toBe(3);
  });

  it("returns this year's date and no birth year", async () => {
    const birthday = (await mine("member")).find((c) => c.kind === "birthday")!;
    expect(Object.keys(birthday).sort()).toEqual(["day", "display_name", "kind", "user_id", "years"]);
    expect(birthday.day).toBe(today);
    expect(birthday.years).toBeNull();
  });

  it("returns nothing at all for guests or people with no role", async () => {
    for (const user of ["guest", "norole"] as const) {
      const { data, error } = await (await as(user)).rpc("upcoming_celebrations", { p_from: today, p_days: 30 });
      expect(error, user).toBeNull();
      expect(data, user).toEqual([]);
    }
  });

  it("hides people who opted out", async () => {
    await svc.from("profiles").update({ celebrate: false }).eq("id", WALKER);
    expect(await mine("member")).toEqual([]);
  });

  it("is refused without a session", async () => {
    const { anon } = await import("./helpers");
    const { error } = await anon().rpc("upcoming_celebrations", { p_from: today, p_days: 1 });
    expect(error).not.toBeNull();
  });
});

describe("map_move", () => {
  let otherBranch: string;

  beforeAll(async () => {
    const { data } = await svc.from("branches").select("id").neq("id", BRANCH_HQ).limit(1).single();
    otherBranch = data!.id;
  });

  beforeEach(async () => {
    await clearMap();
    await checkOut(WALKER);
  });

  afterAll(async () => {
    await checkOut(WALKER);
    await clearMap();
  });

  const move = async (branch = BRANCH_HQ, x = 7, y = 9) =>
    (await as("community")).rpc("map_move", { p_branch_id: branch, p_x: x, p_y: y });

  it("is refused when not checked in", async () => {
    expect((await move()).error?.message).toContain("not_checked_in");
  });

  it("is refused at a branch other than the one checked in at", async () => {
    await checkIn(WALKER);
    expect((await move(otherBranch)).error?.message).toContain("not_checked_in");
    const { data } = await svc.from("map_positions").select("user_id").eq("user_id", WALKER);
    expect(data).toEqual([]);
  });

  it("is refused on a field day, which has no branch floor to walk", async () => {
    await checkIn(WALKER, "field");
    expect((await move()).error?.message).toContain("not_checked_in");
  });

  it("saves the position of someone checked in at that branch", async () => {
    await checkIn(WALKER);
    const { data, error } = await move(BRANCH_HQ, 11, 12);
    expect(error).toBeNull();
    expect(data).toBe(true);
    const { data: row } = await svc.from("map_positions").select("branch_id, tile_x, tile_y").eq("user_id", WALKER).single();
    expect(row).toEqual({ branch_id: BRANCH_HQ, tile_x: 11, tile_y: 12 });
  });

  it("ignores moves that come too fast", async () => {
    await checkIn(WALKER);
    expect((await move(BRANCH_HQ, 3, 3)).data).toBe(true);
    expect((await move(BRANCH_HQ, 4, 4)).data).toBe(false);
    const { data: row } = await svc.from("map_positions").select("tile_x").eq("user_id", WALKER).single();
    expect(row?.tile_x).toBe(3);
  });

  it("refuses a position off the map", async () => {
    await checkIn(WALKER);
    expect((await move(BRANCH_HQ, -1, 3)).error?.message).toContain("invalid_position");
    expect((await move(BRANCH_HQ, 3, 501)).error?.message).toContain("invalid_position");
  });

  it("is refused for requesters and guests", async () => {
    for (const user of ["sales", "guest"] as const) {
      const { error } = await (await as(user)).rpc("map_move", { p_branch_id: BRANCH_HQ, p_x: 1, p_y: 1 });
      expect(error?.code, user).toBe("42501");
    }
  });

  it("positions cannot be written directly", async () => {
    const client = await as("community");
    const { error } = await client.from("map_positions").insert({ user_id: WALKER, branch_id: BRANCH_HQ, tile_x: 1, tile_y: 1 });
    expect(error).not.toBeNull();
  });

  it("marketing reads positions; requesters and guests do not", async () => {
    await checkIn(WALKER);
    await move();
    expect((await (await as("member")).from("map_positions").select("user_id").eq("user_id", WALKER)).data).toHaveLength(1);
    for (const user of ["sales", "guest"] as const) {
      expect((await (await as(user)).from("map_positions").select("user_id").eq("user_id", WALKER)).data, user).toEqual([]);
    }
  });

  it("checking out clears the position", async () => {
    await checkIn(WALKER);
    await move();
    await checkOut(WALKER);
    const { data } = await svc.from("map_positions").select("user_id").eq("user_id", WALKER);
    expect(data).toEqual([]);
  });
});

describe("map_interact", () => {
  beforeEach(async () => {
    await clearMap();
    await checkIn(WALKER);
    await checkIn(COLLEAGUE);
  });

  afterEach(clearMap);

  afterAll(async () => {
    await checkOut(WALKER);
    await checkOut(COLLEAGUE);
    if (opened.length) await svc.from("attendance_sessions").delete().in("id", opened);
  });

  const wave = async (to: string = COLLEAGUE, kind = "wave") => (await as("community")).rpc("map_interact", { p_to: to, p_kind: kind });

  it("reaches a colleague on the same floor", async () => {
    expect((await wave()).error).toBeNull();
    const { data } = await svc.from("map_interactions").select("from_id, to_id, kind").eq("from_id", WALKER);
    expect(data).toEqual([{ from_id: WALKER, to_id: COLLEAGUE, kind: "wave" }]);
  });

  it("a solo emote needs no target", async () => {
    expect((await wave(NO_TARGET, "dance")).error).toBeNull();
  });

  it("a coffee invitation notifies the colleague", async () => {
    expect((await wave(COLLEAGUE, "coffee")).error).toBeNull();
    const { data } = await svc.from("notifications").select("kind").eq("user_id", COLLEAGUE).eq("kind", "map_invite");
    expect(data).toHaveLength(1);
  });

  it("is refused for requesters and guests", async () => {
    for (const user of ["sales", "guest"] as const) {
      const { error } = await (await as(user)).rpc("map_interact", { p_to: COLLEAGUE, p_kind: "wave" });
      expect(error?.code, user).toBe("42501");
    }
  });

  it("is refused when the sender is not checked in", async () => {
    await checkOut(WALKER);
    expect((await wave()).error?.message).toContain("not_checked_in");
  });

  it("is refused for a target who is not checked in", async () => {
    await checkOut(COLLEAGUE);
    expect((await wave()).error?.message).toContain("not_here");
  });

  it("is refused for a target on another floor", async () => {
    await checkIn(COLLEAGUE, "field");
    expect((await wave()).error?.message).toContain("not_here");
    const { data } = await svc.from("map_interactions").select("id").eq("from_id", WALKER);
    expect(data).toEqual([]);
  });

  it("refuses unknown kinds and aiming at yourself", async () => {
    expect((await wave(COLLEAGUE, "punch")).error?.message).toContain("invalid_kind");
    expect((await wave(WALKER)).error?.message).toContain("invalid_target");
  });

  it("slows down someone sending too many", async () => {
    for (let i = 0; i < 5; i++) expect((await wave()).error, `send ${i}`).toBeNull();
    expect((await wave()).error?.message).toContain("rate_limited");
  });

  it("interactions are readable only by the two people involved", async () => {
    await wave();
    const read = async (user: "community" | "leadPerformance" | "member" | "admin" | "sales" | "guest") =>
      (await (await as(user)).from("map_interactions").select("id").eq("from_id", WALKER)).data;
    expect(await read("community")).toHaveLength(1);
    expect(await read("leadPerformance")).toHaveLength(1);
    for (const user of ["member", "admin", "sales", "guest"] as const) expect(await read(user), user).toEqual([]);
  });

  it("interactions cannot be written directly", async () => {
    const { error } = await (await as("community")).from("map_interactions").insert({ from_id: WALKER, to_id: COLLEAGUE, kind: "wave" });
    expect(error).not.toBeNull();
  });
});
