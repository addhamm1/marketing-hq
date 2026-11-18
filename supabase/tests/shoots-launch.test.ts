import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, BRANCH_HQ, makePipelineCard, service, U } from "./helpers";

const svc = service();
const tag = `w15-${Date.now()}`;
const shootIds: string[] = [];
const cardIds: string[] = [];

/** A shoot created with the service role, owned by `traffic`. */
async function makeShoot(title: string) {
  const { data, error } = await svc
    .from("shoots")
    .insert({ title: `${tag} ${title}`, shoot_on: "2027-09-01", branch_id: BRANCH_HQ, created_by: U.traffic })
    .select("id")
    .single();
  if (error) throw error;
  shootIds.push(data.id);
  return data.id;
}

afterAll(async () => {
  await svc.from("notifications").delete().in("user_id", [U.guest, U.member]).like("data->>title", `${tag}%`);
  if (shootIds.length) await svc.from("shoots").delete().in("id", shootIds);
  if (cardIds.length) await svc.from("cards").delete().in("id", cardIds);
});

describe("shoots: who can create", () => {
  const row = (who: string, created_by: string) => ({ title: `${tag} by ${who}`, shoot_on: "2027-09-02", branch_id: BRANCH_HQ, created_by });

  it("a marketing writer creates a shoot", async () => {
    const { data, error } = await (await as("member")).from("shoots").insert(row("member", U.member)).select("id").single();
    expect(error).toBeNull();
    shootIds.push(data!.id);
  });

  it("nobody can create a shoot in someone else's name", async () => {
    const { error } = await (await as("member")).from("shoots").insert(row("forged", U.traffic));
    expect(error?.code).toBe("42501");
  });

  it.each([["leadership", U.leadership], ["sales", U.sales], ["guest", U.guest], ["hr", U.hr]] as const)(
    "%s cannot create a shoot",
    async (who, id) => {
      const { error } = await (await as(who)).from("shoots").insert(row(who, id));
      expect(error?.code).toBe("42501");
    },
  );

  it("the database refuses a shoot with no place or a wrap before the call", async () => {
    const member = await as("member");
    const noPlace = await member.from("shoots").insert({ title: `${tag} x`, shoot_on: "2027-09-02", created_by: U.member });
    expect(noPlace.error?.code).toBe("23514");
    const badWrap = await member.from("shoots").insert({ ...row("wrap", U.member), call_time: "10:00", wrap_time: "09:00" });
    expect(badWrap.error?.code).toBe("23514");
  });
});

describe("shoots: who can see and edit", () => {
  let mine: string;
  let other: string;

  beforeAll(async () => {
    mine = await makeShoot("guest is on this one");
    other = await makeShoot("guest is not on this one");
    const { error } = await svc.from("shoot_crew").insert([
      { shoot_id: mine, user_id: U.guest, external_name: null, role: "Talent" },
      { shoot_id: other, user_id: null, external_name: "Outside person", role: "" },
    ]);
    if (error) throw error;
    await svc.from("shoot_shots").insert([{ shoot_id: mine, description: "A" }, { shoot_id: other, description: "B" }]);
    await svc.from("shoot_equipment").insert([{ shoot_id: mine, item: "Tripod" }, { shoot_id: other, item: "Gimbal" }]);
  });

  const seen = async (who: Parameters<typeof as>[0], table: "shoots" | "shoot_crew" | "shoot_shots" | "shoot_equipment") => {
    const column = table === "shoots" ? "id" : "shoot_id";
    const { data, error } = await (await as(who)).from(table).select(column).in(column, [mine, other]);
    expect(error).toBeNull();
    return new Set((data as unknown as Record<string, string>[]).map((r) => r[column]));
  };

  it.each(["shoots", "shoot_crew", "shoot_shots", "shoot_equipment"] as const)("a crew guest sees only their shoot in %s", async (table) => {
    expect([...(await seen("guest", table))]).toEqual([mine]);
  });

  it.each(["shoots", "shoot_crew", "shoot_shots", "shoot_equipment"] as const)("a requester sees nothing in %s", async (table) => {
    expect((await seen("sales", table)).size).toBe(0);
  });

  it("marketing and leadership read every shoot", async () => {
    expect((await seen("member2", "shoots")).size).toBe(2);
    expect((await seen("leadership", "shoots")).size).toBe(2);
  });

  it("a member not on the crew cannot edit anything on the shoot", async () => {
    const member = await as("member2");
    const update = await member.from("shoots").update({ title: `${tag} hijacked` }).eq("id", other).select("id");
    expect(update.data).toEqual([]);
    expect((await member.from("shoot_crew").insert({ shoot_id: other, user_id: U.member2 })).error?.code).toBe("42501");
    expect((await member.from("shoot_shots").insert({ shoot_id: other, description: "No" })).error?.code).toBe("42501");
    expect((await member.from("shoot_equipment").insert({ shoot_id: other, item: "No" })).error?.code).toBe("42501");
    const removed = await member.from("shoot_shots").delete().eq("shoot_id", other).select("id");
    expect(removed.data).toEqual([]);
  });

  it("someone on the crew can edit their shoot", async () => {
    await svc.from("shoot_crew").insert({ shoot_id: mine, user_id: U.member2, role: "Camera" });
    const member = await as("member2");
    const shot = await member.from("shoot_shots").insert({ shoot_id: mine, description: `${tag} wide` }).select("id").single();
    expect(shot.error).toBeNull();
    const done = await member.from("shoot_shots").update({ done: true, position: 4 }).eq("id", shot.data!.id).select("done");
    expect(done.data).toEqual([{ done: true }]);
  });

  it("a crew guest can tick their own shoot but not the other one", async () => {
    const guest = await as("guest");
    expect((await guest.from("shoot_equipment").update({ packed: true }).eq("shoot_id", mine).select("id")).data?.length).toBe(1);
    expect((await guest.from("shoot_equipment").update({ packed: true }).eq("shoot_id", other).select("id")).data).toEqual([]);
  });

  it("a requester and leadership cannot edit", async () => {
    for (const who of ["sales", "leadership"] as const) {
      const r = await (await as(who)).from("shoots").update({ title: `${tag} no` }).eq("id", mine).select("id");
      expect(r.data).toEqual([]);
    }
  });

  it("the producer can edit without being on the crew", async () => {
    const id = await makeShoot("produced by community");
    await svc.from("shoots").update({ producer_id: U.community }).eq("id", id);
    const r = await (await as("community")).from("shoots").update({ status: "confirmed" }).eq("id", id).select("status");
    expect(r.data).toEqual([{ status: "confirmed" }]);
  });

  it("only super admin and traffic hard-delete a shoot", async () => {
    const id = await makeShoot("to delete");
    expect((await (await as("member")).from("shoots").delete().eq("id", id).select("id")).data).toEqual([]);
    expect((await (await as("traffic")).from("shoots").delete().eq("id", id).select("id")).data?.length).toBe(1);
  });

  it("linked cards: an editor links a card they can see, others cannot", async () => {
    const card = await makePipelineCard("production");
    cardIds.push(card.id);
    const traffic = await as("traffic");
    expect((await traffic.from("shoot_cards").insert({ shoot_id: other, card_id: card.id })).error).toBeNull();
    expect((await (await as("sales")).from("shoot_cards").insert({ shoot_id: mine, card_id: card.id })).error?.code).toBe("42501");
    expect((await (await as("member2")).from("shoot_cards").delete().eq("shoot_id", other).select("card_id")).data).toEqual([]);
  });

  it("adding a team member to the crew tells them", async () => {
    const { data } = await svc.from("notifications").select("kind, link").eq("user_id", U.guest).eq("kind", "shoot_crew_added").eq("link", `/shoots/${mine}`);
    expect(data?.length).toBe(1);
  });
});

describe("seasonal_events", () => {
  const row = (key: string) => ({ key: `${tag}-${key}`, name_en: "Test", name_ar: "تجربة", starts_on: "2031-01-01", ends_on: "2031-01-02" });

  afterAll(async () => {
    await svc.from("seasonal_events").delete().like("key", `${tag}-%`);
  });

  it("super_admin creates, edits and deletes", async () => {
    const admin = await as("admin");
    const created = await admin.from("seasonal_events").insert(row("admin")).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id;
    expect((await admin.from("seasonal_events").update({ items: ["winter-scarf"], is_active: false }).eq("id", id).select("is_active")).data).toEqual([{ is_active: false }]);
    expect((await admin.from("seasonal_events").delete().eq("id", id).select("id")).data?.length).toBe(1);
  });

  it.each(["hr", "traffic", "member", "leadership", "sales", "guest"] as const)("%s cannot write", async (who) => {
    const client = await as(who);
    expect((await client.from("seasonal_events").insert(row(who))).error?.code).toBe("42501");
    const { data: first } = await svc.from("seasonal_events").select("id, name_en").limit(1).single();
    expect((await client.from("seasonal_events").update({ name_en: "Hacked" }).eq("id", first!.id).select("id")).data).toEqual([]);
    expect((await client.from("seasonal_events").delete().eq("id", first!.id).select("id")).data).toEqual([]);
  });

  it("every active user can read them", async () => {
    const { data, error } = await (await as("sales")).from("seasonal_events").select("id").limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("the database refuses an end before the start", async () => {
    const { error } = await (await as("admin")).from("seasonal_events").insert({ ...row("dates"), ends_on: "2030-12-31" });
    expect(error?.code).toBe("23514");
  });
});

describe("own birthday", () => {
  let before: { birth_month: number | null; birth_day: number | null; celebrate: boolean; joined_on: string | null };

  beforeAll(async () => {
    const { data } = await svc.from("profiles").select("birth_month, birth_day, celebrate, joined_on").eq("id", U.member).single();
    before = data!;
  });
  afterAll(async () => {
    await svc.from("profiles").update(before).eq("id", U.member);
  });

  it("a user sets their own birthday and opts out of celebrations", async () => {
    const { data, error } = await (await as("member")).from("profiles")
      .update({ birth_month: 3, birth_day: 14, celebrate: false }).eq("id", U.member).select("birth_month, birth_day, celebrate");
    expect(error).toBeNull();
    expect(data).toEqual([{ birth_month: 3, birth_day: 14, celebrate: false }]);
  });

  it("29 February is a valid birthday", async () => {
    const { error } = await (await as("member")).from("profiles").update({ birth_month: 2, birth_day: 29 }).eq("id", U.member);
    expect(error).toBeNull();
  });

  it("a user cannot set their own joining date", async () => {
    const { error } = await (await as("member")).from("profiles").update({ joined_on: "2020-01-01" }).eq("id", U.member);
    expect(error?.code).toBe("42501");
  });

  it("a user cannot set someone else's birthday", async () => {
    const r = await (await as("member")).from("profiles").update({ birth_month: 1, birth_day: 1 }).eq("id", U.member2).select("id");
    expect(r.data).toEqual([]);
  });

  it.each([[2, 31], [2, 30], [4, 31], [13, 1], [0, 5]])("the database refuses month %i day %i", async (birth_month, birth_day) => {
    const { error } = await (await as("member")).from("profiles").update({ birth_month, birth_day }).eq("id", U.member);
    expect(error?.code).toBe("23514");
  });

  it("the database refuses a month without a day", async () => {
    const { error } = await (await as("member")).from("profiles").update({ birth_month: 5, birth_day: null }).eq("id", U.member);
    expect(error?.code).toBe("23514");
  });
});

describe("admin user editor (admin_update_profile)", () => {
  let before: { birth_month: number | null; birth_day: number | null; joined_on: string | null; phone: string | null; home_branch_id: string | null };

  beforeAll(async () => {
    const { data } = await svc.from("profiles").select("birth_month, birth_day, joined_on, phone, home_branch_id").eq("id", U.member2).single();
    before = data!;
  });
  afterAll(async () => {
    await svc.from("profiles").update(before).eq("id", U.member2);
  });

  it("super_admin sets birthday, joining date, phone and home branch", async () => {
    const patch = { birth_month: 7, birth_day: 9, joined_on: "2024-02-03", phone: "01000000000", home_branch_id: BRANCH_HQ };
    const { error } = await (await as("admin")).rpc("admin_update_profile", { p_user_id: U.member2, patch });
    expect(error).toBeNull();
    const { data } = await svc.from("profiles").select("birth_month, birth_day, joined_on, phone, home_branch_id").eq("id", U.member2).single();
    expect(data).toEqual(patch);
  });

  it("hr sets people details but not the phone", async () => {
    const hr = await as("hr");
    expect((await hr.rpc("admin_update_profile", { p_user_id: U.member2, patch: { joined_on: "2023-05-06" } })).error).toBeNull();
    expect((await hr.rpc("admin_update_profile", { p_user_id: U.member2, patch: { phone: "0" } })).error?.code).toBe("42501");
  });

  it("the function refuses 31 February", async () => {
    const { error } = await (await as("admin")).rpc("admin_update_profile", { p_user_id: U.member2, patch: { birth_month: 2, birth_day: 31 } });
    expect(error?.code).toBe("23514");
  });

  it("a member cannot use it", async () => {
    const { error } = await (await as("member")).rpc("admin_update_profile", { p_user_id: U.member2, patch: { joined_on: "2020-01-01" } });
    expect(error?.code).toBe("42501");
  });
});

describe("admin editors added for launch", () => {
  afterAll(async () => {
    await svc.from("brands").delete().like("slug", `${tag}%`);
    await svc.from("departments").delete().like("slug", `${tag}%`);
    await svc.from("meeting_rooms").delete().like("name_en", `${tag}%`);
  });

  it("super_admin adds a brand, a department and a meeting room", async () => {
    const admin = await as("admin");
    expect((await admin.from("brands").insert({ name: tag, slug: `${tag}-b` })).error).toBeNull();
    expect((await admin.from("departments").insert({ name_en: tag, name_ar: tag, slug: `${tag}-d` })).error).toBeNull();
    expect((await admin.from("meeting_rooms").insert({ branch_id: BRANCH_HQ, name_en: tag, name_ar: tag })).error).toBeNull();
  });

  it("a member cannot", async () => {
    const member = await as("member");
    expect((await member.from("brands").insert({ name: tag, slug: `${tag}-m` })).error?.code).toBe("42501");
    expect((await member.from("departments").insert({ name_en: tag, name_ar: tag, slug: `${tag}-m` })).error?.code).toBe("42501");
    expect((await member.from("meeting_rooms").insert({ branch_id: BRANCH_HQ, name_en: tag, name_ar: tag })).error?.code).toBe("42501");
  });

  it("only super_admin confirms a branch location", async () => {
    const { data: branch } = await svc.from("branches").select("id, location_confirmed_at").eq("slug", "zagazig").single();
    const stamp = new Date().toISOString();
    expect((await (await as("member")).from("branches").update({ location_confirmed_at: stamp }).eq("id", branch!.id).select("id")).data).toEqual([]);
    expect((await (await as("hr")).from("branches").update({ location_confirmed_at: stamp }).eq("id", branch!.id).select("id")).data).toEqual([]);
    expect((await (await as("admin")).from("branches").update({ location_confirmed_at: stamp }).eq("id", branch!.id).select("id")).data?.length).toBe(1);
    await svc.from("branches").update({ location_confirmed_at: branch!.location_confirmed_at }).eq("id", branch!.id);
  });
});
