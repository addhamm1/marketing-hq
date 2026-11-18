import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anon, as, makePipelineCard, service, U } from "./helpers";

// A month nothing else uses, far enough ahead to stay clear of the live screens.
const at = new Date();
const monthAt = (offset: number) => {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + offset, 1));
  return d.toISOString().slice(0, 10);
};
const MONTH = monthAt(9);
const NEW_ITEM = null as unknown as string;

const svc = service();
let trackId: string;
let cardId: string;

async function monthItems() {
  const { data, error } = await svc.from("gate_items").select("*").eq("month", MONTH);
  if (error) throw error;
  return data;
}

async function oneOff(owner: string | null, name = "Access test item") {
  const day = MONTH.slice(0, 8) + "12";
  const { data, error } = await svc
    .from("gate_items")
    .insert({ month: MONTH, track_id: trackId, kind: "gate", name_en: name, name_ar: name, starts_on: day, due_on: day, owner_id: owner, customised: true })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

const edit = (item: { name_en: string; name_ar: string; starts_on: string; due_on: string }, changes: Record<string, unknown> = {}) => ({
  name_en: item.name_en, name_ar: item.name_ar, starts_on: item.starts_on, due_on: item.due_on,
  owner_id: "", status: "not_started", note: "", ...changes,
});

beforeAll(async () => {
  const { data, error } = await svc
    .from("gate_tracks")
    .insert({ key: `access-test-${Date.now()}`, name_en: "Access test", name_ar: "اختبار", position: 90 })
    .select("id")
    .single();
  if (error) throw error;
  trackId = data.id;
  cardId = (await makePipelineCard("production")).id;
  const traffic = await as("traffic");
  const { error: buildError } = await traffic.rpc("ensure_gate_month", { p_month: MONTH });
  if (buildError) throw buildError;
});

afterAll(async () => {
  await svc.from("gate_item_exclusions").delete().eq("month", MONTH);
  await svc.from("gate_items").delete().eq("month", MONTH);
  await svc.from("gate_tracks").delete().eq("id", trackId);
  await svc.from("cards").delete().eq("id", cardId);
});

describe("reading", () => {
  it.each(["member", "traffic", "admin", "leadership", "hr", "sales"] as const)("%s reads the month", async (user) => {
    const client = await as(user);
    const [items, tracks, templates] = await Promise.all([
      client.from("gate_items").select("id").eq("month", MONTH),
      client.from("gate_tracks").select("id"),
      client.from("gate_templates").select("id"),
    ]);
    expect(items.data?.length).toBeGreaterThan(0);
    expect(tracks.data?.length).toBeGreaterThan(0);
    expect(templates.data?.length).toBeGreaterThan(0);
  });

  it("refuses a guest", async () => {
    const guest = await as("guest");
    const [items, tracks, templates] = await Promise.all([
      guest.from("gate_items").select("id").eq("month", MONTH),
      guest.from("gate_tracks").select("id"),
      guest.from("gate_templates").select("id"),
    ]);
    expect(items.data).toEqual([]);
    expect(tracks.data).toEqual([]);
    expect(templates.data).toEqual([]);
    const { error } = await guest.rpc("ensure_gate_month", { p_month: MONTH });
    expect(error?.code).toBe("42501");
  });

  it("refuses someone signed out", async () => {
    const { error } = await anon().rpc("ensure_gate_month", { p_month: MONTH });
    expect(error).not.toBeNull();
    const { data } = await anon().from("gate_items").select("id").eq("month", MONTH);
    expect(data ?? []).toEqual([]);
  });
});

describe("ensure_gate_month", () => {
  it("refuses months far from today", async () => {
    const member = await as("member");
    for (const offset of [13, -13, 60]) {
      const { error } = await member.rpc("ensure_gate_month", { p_month: monthAt(offset) });
      expect(error?.code).toBe("22023");
      expect(error?.message).toContain("month_out_of_range");
    }
  });

  it("is safe to repeat", async () => {
    const before = (await monthItems()).length;
    const member = await as("member");
    const { data, error } = await member.rpc("ensure_gate_month", { p_month: MONTH });
    expect(error).toBeNull();
    expect(data).toBe(0);
    expect((await monthItems()).length).toBe(before);
  });

  it("moves a gate that falls on a Friday to the working day before it", async () => {
    const first = new Date(`${MONTH}T12:00:00Z`);
    const friday = 1 + ((5 - first.getUTCDay() + 7) % 7) + 7; // the second Friday of the month
    const { data: holidays } = await svc.from("holidays").select("day, is_half_day");
    const off = new Set((holidays ?? []).filter((h) => !h.is_half_day).map((h) => h.day));
    let expected = friday - 1;
    const dateOf = (d: number) => `${MONTH.slice(0, 8)}${String(d).padStart(2, "0")}`;
    while (off.has(dateOf(expected)) || new Date(`${dateOf(expected)}T12:00:00Z`).getUTCDay() === 5) expected--;

    const { data: template, error } = await svc
      .from("gate_templates")
      .insert({ track_id: trackId, kind: "gate", name_en: "Friday gate", name_ar: "بوابة الجمعة", start_day: friday, end_day: friday })
      .select("id")
      .single();
    expect(error).toBeNull();
    await (await as("member")).rpc("ensure_gate_month", { p_month: MONTH });

    const items = (await monthItems()).filter((i) => i.template_id === template!.id);
    expect(items).toHaveLength(1);
    expect(new Date(`${dateOf(friday)}T12:00:00Z`).getUTCDay()).toBe(5);
    expect(items[0].due_on).toBe(dateOf(expected));
    expect(items[0].starts_on).toBe(dateOf(expected));
  });
});

describe("status", () => {
  it("lets the owner update their own item only", async () => {
    const mine = await oneOff(U.member, "Owned by member");
    const other = await oneOff(U.member2, "Owned by member2");
    const member = await as("member");

    const allowed = await member.rpc("set_gate_status", { p_id: mine.id, p_status: "in_progress", p_note: "On it" });
    expect(allowed.error).toBeNull();
    const { data } = await svc.from("gate_items").select("status, note, customised").eq("id", mine.id).single();
    expect(data).toEqual({ status: "in_progress", note: "On it", customised: true });

    const refused = await member.rpc("set_gate_status", { p_id: other.id, p_status: "done" });
    expect(refused.error?.code).toBe("42501");
    const { data: untouched } = await svc.from("gate_items").select("status").eq("id", other.id).single();
    expect(untouched?.status).toBe("not_started");
  });

  it.each(["traffic", "admin"] as const)("lets %s update anyone's item", async (user) => {
    const item = await oneOff(U.member2, `Status by ${user}`);
    const { error } = await (await as(user)).rpc("set_gate_status", { p_id: item.id, p_status: "done" });
    expect(error).toBeNull();
    const { data } = await svc.from("gate_items").select("status, completed_at").eq("id", item.id).single();
    expect(data?.status).toBe("done");
    expect(data?.completed_at).not.toBeNull();
  });

  it.each(["leadership", "leadCreative", "hr"] as const)("refuses %s, who does not own the item", async (user) => {
    const item = await oneOff(U.member, `Refused for ${user}`);
    const { error } = await (await as(user)).rpc("set_gate_status", { p_id: item.id, p_status: "done" });
    expect(error?.code).toBe("42501");
  });
});

describe("editing items", () => {
  it("refuses a member, even on their own item", async () => {
    const item = await oneOff(U.member, "Member cannot edit");
    const member = await as("member");
    const saved = await member.rpc("save_gate_item", { p_id: item.id, p: edit(item, { name_en: "Renamed" }) });
    expect(saved.error?.code).toBe("42501");
    const removed = await member.rpc("delete_gate_item", { p_id: item.id });
    expect(removed.error?.code).toBe("42501");
    const added = await member.rpc("save_gate_item", { p_id: NEW_ITEM, p: { ...edit(item), month: MONTH, track_id: trackId, kind: "gate" } });
    expect(added.error?.code).toBe("42501");
    const direct = await member.from("gate_items").update({ name_en: "Direct" }).eq("id", item.id);
    expect(direct.error?.code).toBe("42501");
    const { data } = await svc.from("gate_items").select("name_en").eq("id", item.id).single();
    expect(data?.name_en).toBe("Member cannot edit");
  });

  it.each(["traffic", "admin"] as const)("lets %s rename, add and delete", async (user) => {
    const client = await as(user);
    const item = await oneOff(null, `Editable by ${user}`);
    const saved = await client.rpc("save_gate_item", { p_id: item.id, p: edit(item, { name_ar: "اسم جديد", owner_id: U.member }) });
    expect(saved.error).toBeNull();
    const { data: after } = await svc.from("gate_items").select("name_ar, owner_id, customised").eq("id", item.id).single();
    expect(after).toEqual({ name_ar: "اسم جديد", owner_id: U.member, customised: true });

    const added = await client.rpc("save_gate_item", {
      p_id: NEW_ITEM,
      p: { ...edit(item, { name_en: `One-off by ${user}` }), month: MONTH, track_id: trackId, kind: "checkpoint" },
    });
    expect(added.error).toBeNull();
    const removed = await client.rpc("delete_gate_item", { p_id: added.data! });
    expect(removed.error).toBeNull();
    const { data: gone } = await svc.from("gate_items").select("id").eq("id", added.data!);
    expect(gone).toEqual([]);
  });

  it("blocks direct writes even for managers: changes go through the functions", async () => {
    const item = await oneOff(null, "No direct writes");
    const { error } = await (await as("traffic")).from("gate_items").update({ name_en: "Direct" }).eq("id", item.id);
    expect(error?.code).toBe("42501");
  });
});

describe("a month keeps what managers did to it", () => {
  it("does not bring back a deleted item", async () => {
    const item = (await monthItems()).find((i) => i.name_en === "MQL review, day 20")!;
    const traffic = await as("traffic");
    expect((await traffic.rpc("delete_gate_item", { p_id: item.id })).error).toBeNull();
    await traffic.rpc("ensure_gate_month", { p_month: MONTH });
    expect((await monthItems()).filter((i) => i.template_id === item.template_id)).toEqual([]);
  });

  it("does not duplicate an item moved to another date", async () => {
    const item = (await monthItems()).find((i) => i.name_en.startsWith("Gate 25"))!;
    const moved = `${MONTH.slice(0, 8)}27`;
    const traffic = await as("traffic");
    const saved = await traffic.rpc("save_gate_item", { p_id: item.id, p: edit(item, { starts_on: moved, due_on: moved }) });
    expect(saved.error).toBeNull();
    await traffic.rpc("ensure_gate_month", { p_month: MONTH });
    const copies = (await monthItems()).filter((i) => i.template_id === item.template_id);
    expect(copies.map((i) => i.due_on)).toEqual([moved]);
  });

  it("does not refill the old date of a moved recurring item", async () => {
    const spending = (await monthItems()).filter((i) => i.kind === "recurring").sort((a, b) => a.due_on.localeCompare(b.due_on));
    const item = spending[0];
    const dates = new Set(spending.map((i) => i.due_on));
    let target = item.due_on;
    for (let d = Number(item.due_on.slice(8)) + 1; dates.has(target); d++) target = `${MONTH.slice(0, 8)}${String(d).padStart(2, "0")}`;
    const traffic = await as("traffic");
    const saved = await traffic.rpc("save_gate_item", { p_id: item.id, p: edit(item, { starts_on: target, due_on: target }) });
    expect(saved.error).toBeNull();
    await traffic.rpc("ensure_gate_month", { p_month: MONTH });
    const after = (await monthItems()).filter((i) => i.template_id === item.template_id).map((i) => i.due_on);
    expect(after).toContain(target);
    expect(after).not.toContain(item.due_on);
    expect(after).toHaveLength(spending.length);
  });

  it("refuses to move a recurring item onto a date it already has", async () => {
    const spending = (await monthItems()).filter((i) => i.kind === "recurring").sort((a, b) => a.due_on.localeCompare(b.due_on));
    const [a, b] = [spending[1], spending[2]];
    const { error } = await (await as("traffic")).rpc("save_gate_item", { p_id: a.id, p: edit(a, { starts_on: b.due_on, due_on: b.due_on }) });
    expect(error?.code).toBe("23505");
  });

  it("keeps exclusions private to managers and written only by the functions", async () => {
    const row = { template_id: (await monthItems()).find((i) => i.template_id)!.template_id!, month: MONTH, due_on: MONTH };
    const traffic = await as("traffic");
    const member = await as("member");
    expect((await traffic.from("gate_item_exclusions").select("month").eq("month", MONTH)).data?.length).toBeGreaterThan(0);
    expect((await member.from("gate_item_exclusions").select("month").eq("month", MONTH)).data).toEqual([]);
    expect((await traffic.from("gate_item_exclusions").insert(row)).error?.code).toBe("42501");
    expect((await member.from("gate_item_exclusions").insert(row)).error?.code).toBe("42501");
  });
});

describe("linked cards", () => {
  it("lets a manager link and unlink, and refuses a member", async () => {
    const item = await oneOff(null, "Linked item");
    const traffic = await as("traffic");
    const member = await as("member");
    const link = { item_id: item.id, card_id: cardId };

    expect((await member.from("gate_item_cards").insert(link)).error?.code).toBe("42501");
    expect((await traffic.from("gate_item_cards").insert(link)).error).toBeNull();
    expect((await traffic.from("gate_item_cards").select("card_id").eq("item_id", item.id)).data).toEqual([{ card_id: cardId }]);

    await member.from("gate_item_cards").delete().eq("item_id", item.id);
    expect((await svc.from("gate_item_cards").select("card_id").eq("item_id", item.id)).data).toHaveLength(1);

    expect((await traffic.from("gate_item_cards").delete().eq("item_id", item.id)).error).toBeNull();
    expect((await svc.from("gate_item_cards").select("card_id").eq("item_id", item.id)).data).toEqual([]);
  });
});

describe("the standing rhythm", () => {
  const template = () => ({
    track_id: trackId, kind: "checkpoint", name_en: "Rhythm test", name_ar: "اختبار النظام",
    start_day: 15, end_day: 15, weekdays: [], owner_id: "", position: 5, is_active: true,
  });

  it("refuses a member and a team lead", async () => {
    for (const user of ["member", "leadCreative"] as const) {
      const client = await as(user);
      expect((await client.rpc("save_gate_template", { p_id: NEW_ITEM, p: template() })).error?.code).toBe("42501");
      expect((await client.from("gate_templates").insert({ track_id: trackId, kind: "phase", name_en: "x", name_ar: "x", start_day: 1, end_day: 2 })).error?.code).toBe("42501");
      const { data } = await client.from("gate_tracks").update({ name_en: "Hacked" }).eq("id", trackId).select("id");
      expect(data).toEqual([]);
      expect((await client.from("gate_tracks").insert({ key: "not-allowed", name_en: "x", name_ar: "x" })).error?.code).toBe("42501");
    }
  });

  it.each(["traffic", "admin"] as const)("lets %s save and delete a template, and edit a track", async (user) => {
    const client = await as(user);
    const saved = await client.rpc("save_gate_template", { p_id: NEW_ITEM, p: { ...template(), name_en: `Rhythm by ${user}` } });
    expect(saved.error).toBeNull();
    await client.rpc("ensure_gate_month", { p_month: MONTH });
    expect((await monthItems()).filter((i) => i.template_id === saved.data).length).toBe(1);

    const { data: track } = await client.from("gate_tracks").update({ subtitle_en: `Edited by ${user}` }).eq("id", trackId).select("id");
    expect(track).toHaveLength(1);

    expect((await client.rpc("delete_gate_template", { p_id: saved.data! })).error).toBeNull();
    expect((await monthItems()).filter((i) => i.template_id === saved.data)).toEqual([]);
  });

  it("keeps a moved item where it is when the rhythm changes", async () => {
    const moved = (await monthItems()).find((i) => i.name_en.startsWith("Gate 25"))!;
    const traffic = await as("traffic");
    const saved = await traffic.rpc("save_gate_template", { p_id: NEW_ITEM, p: template() });
    expect(saved.error).toBeNull();
    const copies = (await monthItems()).filter((i) => i.template_id === moved.template_id);
    expect(copies.map((i) => i.due_on)).toEqual([moved.due_on]);
    await traffic.rpc("delete_gate_template", { p_id: saved.data! });
  });
});
