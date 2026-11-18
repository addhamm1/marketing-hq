import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anon, as, service, U, type Client } from "./helpers";

// Access rules for Meetings. Dates sit far in the future in a room made for this
// run, so nothing here collides with seeded or concurrent bookings.
const svc = service();
const made = { meetings: [] as string[], rooms: [] as string[], series: [] as string[], cards: [] as string[] };
let room: string;
let dayOffset = 0;

function slot() {
  dayOffset += 1;
  const start = new Date(Date.UTC(2031, 0, 1 + dayOffset, 8));
  return { starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 30 * 60_000).toISOString() };
}

async function book(client: Client, extra: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc("save_meeting", {
    p_id: null as unknown as string,
    p: { title: "Access test", agenda: "", ...slot(), attendee_ids: [], ...extra },
  });
  if (error) throw error;
  made.meetings.push(data!);
  return data!;
}

const seen = async (client: Client, id: string) => {
  const { data } = await client.from("meetings").select("id").eq("id", id);
  return (data ?? []).length === 1;
};

beforeAll(async () => {
  const { data, error } = await svc.from("meeting_rooms").insert({ name_en: "Test room", name_ar: "غرفة اختبار" }).select("id").single();
  if (error) throw error;
  room = data.id;
  made.rooms.push(room);
});

afterAll(async () => {
  if (made.cards.length) await svc.from("cards").delete().in("id", made.cards);
  if (made.meetings.length) {
    for (const id of made.meetings) await svc.from("notifications").delete().eq("data->>meeting_id", id);
    await svc.from("meetings").delete().in("id", made.meetings);
  }
  if (made.series.length) await svc.from("meeting_series").delete().in("id", made.series);
  if (made.rooms.length) await svc.from("meeting_rooms").delete().in("id", made.rooms);
});

describe("meetings: who can create", () => {
  it("lets marketing and portal staff book through the function", async () => {
    expect(await book(await as("member"))).toBeTruthy();
    expect(await book(await as("sales"))).toBeTruthy();
  });

  it("refuses a guest, a user with no role and anyone signed out", async () => {
    for (const client of [await as("guest"), await as("norole"), anon()]) {
      const { error } = await client.rpc("save_meeting", { p_id: null as unknown as string, p: { title: "No", ...slot() } });
      expect(error).not.toBeNull();
    }
  });

  it("refuses a direct insert, even for an admin", async () => {
    const { error } = await (await as("admin")).from("meetings").insert({ title: "Direct", ...slot() });
    expect(error?.code).toBe("42501");
  });

  it("reports a room clash as an exclusion violation", async () => {
    const member = await as("member");
    const time = slot();
    await book(member, { ...time, room_id: room });
    const { error } = await (await as("traffic")).rpc("save_meeting", { p_id: null as unknown as string, p: { title: "Clash", ...time, room_id: room } });
    expect(error?.code).toBe("23P01");
  });

  it("names a missing title and a date in the past", async () => {
    const member = await as("member");
    const empty = await member.rpc("save_meeting", { p_id: null as unknown as string, p: { title: "  ", ...slot() } });
    expect(empty.error?.message).toContain("title_required");
    const past = await member.rpc("save_meeting", {
      p_id: null as unknown as string,
      p: { title: "Old", starts_at: "2020-01-01T08:00:00Z", ends_at: "2020-01-01T09:00:00Z" },
    });
    expect(past.error?.message).toContain("in_the_past");
  });
});

describe("meetings: who can see", () => {
  it("shows an open meeting to marketing but not to another department", async () => {
    const id = await book(await as("member"));
    expect(await seen(await as("member2"), id)).toBe(true);
    expect(await seen(await as("leadership"), id)).toBe(true);
    expect(await seen(await as("sales"), id)).toBe(false);
    expect(await seen(await as("guest"), id)).toBe(false);
    expect(await seen(anon(), id)).toBe(false);
  });

  it("shows a meeting to the portal user invited to it", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.sales] });
    expect(await seen(await as("sales"), id)).toBe(true);
    expect(await seen(await as("approver"), id)).toBe(false);
  });

  it("keeps a private meeting to its people and the super admin", async () => {
    const id = await book(await as("member"), { is_private: true, attendee_ids: [U.community] });
    expect(await seen(await as("community"), id)).toBe(true);
    expect(await seen(await as("admin"), id)).toBe(true);
    expect(await seen(await as("member2"), id)).toBe(false);
    expect(await seen(await as("traffic"), id)).toBe(false);
  });

  it("shows busy times without saying what the meeting is", async () => {
    const time = slot();
    await book(await as("member"), { ...time, is_private: true, title: "Secret" });
    const { data, error } = await (await as("sales")).rpc("meeting_busy", { p_from: time.starts_at, p_to: time.ends_at, p_user_ids: [U.member] });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Object.keys(data![0]).sort()).toEqual(["ends_at", "id", "kind", "starts_at"]);
  });

  it("gives a guest no busy times", async () => {
    const time = slot();
    await book(await as("member"), time);
    const { data } = await (await as("guest")).rpc("meeting_busy", { p_from: time.starts_at, p_to: time.ends_at, p_user_ids: [U.member] });
    expect(data ?? []).toHaveLength(0);
  });
});

describe("meetings: who can change", () => {
  const edit = (client: Client, id: string) => client.rpc("save_meeting", { p_id: id, p: { title: "Edited", ...slot() } });

  it("lets the organiser and the traffic manager edit", async () => {
    const id = await book(await as("member"));
    expect((await edit(await as("member"), id)).error).toBeNull();
    expect((await edit(await as("traffic"), id)).error).toBeNull();
  });

  it("refuses an attendee who did not organise it", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.member2] });
    expect((await edit(await as("member2"), id)).error?.code).toBe("42501");
  });

  it("refuses a cancel from anyone but the organiser or a manager", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.member2] });
    expect((await (await as("member2")).rpc("cancel_meeting", { p_id: id })).error?.code).toBe("42501");
    expect((await (await as("member")).rpc("cancel_meeting", { p_id: id })).error).toBeNull();
    const { data } = await svc.from("meetings").select("status").eq("id", id).single();
    expect(data?.status).toBe("cancelled");
  });

  it("frees the room once a meeting is cancelled", async () => {
    const member = await as("member");
    const time = slot();
    const id = await book(member, { ...time, room_id: room });
    await member.rpc("cancel_meeting", { p_id: id });
    expect(await book(member, { ...time, room_id: room })).toBeTruthy();
  });
});

describe("meeting_attendees", () => {
  it("lets an attendee answer for themselves", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.sales] });
    expect((await (await as("sales")).rpc("respond_meeting", { p_id: id, p_response: "tentative" })).error).toBeNull();
    const { data } = await (await as("member")).from("meeting_attendees").select("response").eq("meeting_id", id).eq("user_id", U.sales).single();
    expect(data?.response).toBe("tentative");
  });

  it("refuses someone who is not invited", async () => {
    const id = await book(await as("member"));
    expect((await (await as("member2")).rpc("respond_meeting", { p_id: id, p_response: "accepted" })).error?.code).toBe("42501");
  });

  it("refuses writing to the table directly", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.member2] });
    const member2 = await as("member2");
    expect((await member2.from("meeting_attendees").update({ response: "accepted" }).eq("meeting_id", id)).error?.code).toBe("42501");
    expect((await member2.from("meeting_attendees").insert({ meeting_id: id, user_id: U.community })).error?.code).toBe("42501");
  });
});

describe("meeting_guests", () => {
  const guests = [{ name: "Outside Guest", email: "outside.guest@example.com" }];

  it("shows guest emails to people in the meeting", async () => {
    const id = await book(await as("member"), { guests, attendee_ids: [U.sales] });
    const { data } = await (await as("sales")).from("meeting_guests").select("email").eq("meeting_id", id);
    expect(data).toEqual([{ email: "outside.guest@example.com" }]);
  });

  it("hides guest emails from colleagues who are not in the meeting", async () => {
    const id = await book(await as("member"), { guests });
    const { data } = await (await as("member2")).from("meeting_guests").select("email").eq("meeting_id", id);
    expect(data).toEqual([]);
  });

  it("does not let the organiser stamp an invitation as sent", async () => {
    const id = await book(await as("member"), { guests });
    const { error } = await (await as("member")).from("meeting_guests").update({ invited_at: new Date().toISOString() }).eq("meeting_id", id);
    expect(error?.code).toBe("42501");
  });
});

describe("notes", () => {
  it("lets people in the meeting write and refuses others", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.sales] });
    expect((await (await as("sales")).rpc("save_meeting_notes", { p_id: id, p_notes: "Agreed" })).error).toBeNull();
    expect((await (await as("member2")).rpc("save_meeting_notes", { p_id: id, p_notes: "Nope" })).error?.code).toBe("42501");
    const { data } = await svc.from("meetings").select("notes").eq("id", id).single();
    expect(data?.notes).toBe("Agreed");
  });
});

describe("meeting_actions", () => {
  async function addItem(client: Client, meetingId: string, createdBy: string) {
    const { data, error } = await client.from("meeting_actions").insert({ meeting_id: meetingId, title: "Follow up", created_by: createdBy }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  it("lets people in the meeting add, and colleagues only read", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.sales] });
    const itemId = await addItem(await as("sales"), id, U.sales);
    const member2 = await as("member2");
    expect((await member2.from("meeting_actions").select("id").eq("id", itemId)).data).toHaveLength(1);
    const insert = await member2.from("meeting_actions").insert({ meeting_id: id, title: "Nope", created_by: U.member2 });
    expect(insert.error?.code).toBe("42501");
    const update = await member2.from("meeting_actions").update({ done: true }).eq("id", itemId).select("id");
    expect(update.data).toEqual([]);
    const remove = await member2.from("meeting_actions").delete().eq("id", itemId).select("id");
    expect(remove.data).toEqual([]);
  });

  it("hides the actions of a meeting from another department", async () => {
    const id = await book(await as("member"));
    const itemId = await addItem(await as("member"), id, U.member);
    expect((await (await as("sales")).from("meeting_actions").select("id").eq("id", itemId)).data).toEqual([]);
  });

  it("refuses setting the linked card by hand", async () => {
    const id = await book(await as("member"));
    const itemId = await addItem(await as("member"), id, U.member);
    const { error } = await (await as("member")).from("meeting_actions").update({ card_id: "00000000-0000-4000-8000-000000000099" }).eq("id", itemId);
    expect(error?.code).toBe("42501");
  });

  it("turns an action into one card for marketing, and only once", async () => {
    const member = await as("member");
    const id = await book(member);
    const itemId = await addItem(member, id, U.member);
    const first = await member.rpc("meeting_action_to_card", { p_action_id: itemId });
    expect(first.error).toBeNull();
    made.cards.push(first.data!);
    const again = await member.rpc("meeting_action_to_card", { p_action_id: itemId });
    expect(again.data).toBe(first.data);
  });

  it("refuses a card from a portal user in the meeting", async () => {
    const id = await book(await as("member"), { attendee_ids: [U.sales] });
    const itemId = await addItem(await as("sales"), id, U.sales);
    const { error } = await (await as("sales")).rpc("meeting_action_to_card", { p_action_id: itemId });
    expect(error?.code).toBe("42501");
  });
});

describe("meeting_rooms", () => {
  it("lets every active user read rooms", async () => {
    expect((await (await as("sales")).from("meeting_rooms").select("id").eq("id", room)).data).toHaveLength(1);
  });

  it("lets the traffic manager add a room", async () => {
    const { data, error } = await (await as("traffic")).from("meeting_rooms").insert({ name_en: "Traffic room", name_ar: "غرفة" }).select("id").single();
    expect(error).toBeNull();
    made.rooms.push(data!.id);
  });

  it("refuses a member and a portal user", async () => {
    for (const client of [await as("member"), await as("sales")]) {
      expect((await client.from("meeting_rooms").insert({ name_en: "No", name_ar: "لا" })).error?.code).toBe("42501");
      expect((await client.from("meeting_rooms").update({ capacity: 99 }).eq("id", room).select("id")).data).toEqual([]);
    }
  });
});

describe("meeting_series", () => {
  const rule = { title: "Access series", cadence: "weekly", weekdays: [0], start_time: "10:00", duration_minutes: 30, audience: "custom", starts_on: "2031-06-01" };

  async function create(client: Client) {
    const { data, error } = await client.rpc("save_meeting_series", { p_id: null as unknown as string, p: { ...rule, member_ids: [U.member2] } });
    if (error) throw error;
    made.series.push(data!);
    return data!;
  }

  it("lets the traffic manager and super admin create", async () => {
    expect(await create(await as("traffic"))).toBeTruthy();
    expect(await create(await as("admin"))).toBeTruthy();
  });

  it("refuses everyone else, including portal users", async () => {
    for (const client of [await as("member"), await as("leadCreative"), await as("sales")]) {
      const { error } = await client.rpc("save_meeting_series", { p_id: null as unknown as string, p: rule });
      expect(error?.code).toBe("42501");
    }
  });

  it("lets staff read but never write the tables directly", async () => {
    const id = await create(await as("traffic"));
    const sales = await as("sales");
    expect((await sales.from("meeting_series").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await sales.from("meeting_series_members").select("user_id").eq("series_id", id)).data).toHaveLength(1);
    expect((await sales.from("meeting_series").update({ title: "Hacked" }).eq("id", id)).error?.code).toBe("42501");
    expect((await (await as("traffic")).from("meeting_series_members").insert({ series_id: id, user_id: U.member })).error?.code).toBe("42501");
  });

  it("hides fixed meetings from a guest", async () => {
    const id = await create(await as("traffic"));
    expect((await (await as("guest")).from("meeting_series").select("id").eq("id", id)).data).toEqual([]);
  });

  it("lets only a manager stop one", async () => {
    const id = await create(await as("traffic"));
    expect((await (await as("member")).rpc("archive_meeting_series", { p_id: id })).error?.code).toBe("42501");
    expect((await (await as("sales")).rpc("archive_meeting_series", { p_id: id })).error?.code).toBe("42501");
    expect((await (await as("traffic")).rpc("archive_meeting_series", { p_id: id })).error).toBeNull();
    const { data } = await svc.from("meeting_series").select("is_active").eq("id", id).single();
    expect(data?.is_active).toBe(false);
  });
});
