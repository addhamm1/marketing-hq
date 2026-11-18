import "server-only";
import { cairoInstant } from "@/lib/dates";
import { addDaysTo } from "./format";
import type { CelebrationItem, CheckinState, Client, Localized, MeetingItem, ShootItem } from "./types";

// Every query filters by the person explicitly: the digest runs with the service
// role, where row policies do not narrow anything.

type PgError = { code?: string } | null;

/** Turns a Postgres error into a failure of the section that asked for the data. */
export function must<T>(result: { data: T | null; error: PgError }): T {
  if (result.error) throw new Error(`query_failed:${result.error.code ?? "unknown"}`);
  return result.data as T;
}

type NameRow = { name_en: string; name_ar: string } | null;
const localized = (row: NameRow): Localized | null => (row ? { en: row.name_en, ar: row.name_ar } : null);

type MeetingRow = {
  response: MeetingItem["response"];
  meetings: {
    id: string;
    title: string;
    title_ar: string | null;
    starts_at: string;
    ends_at: string;
    location_text: string | null;
    online_url: string | null;
    meeting_rooms: NameRow;
  };
};

/** Today's meetings that have not finished and that the person has not declined. */
export async function loadMeetings(client: Client, userId: string, date: string, now: Date): Promise<MeetingItem[]> {
  const rows = must(
    await client
      .from("meeting_attendees")
      .select(
        "response, meetings!inner(id, title, title_ar, starts_at, ends_at, location_text, online_url, meeting_rooms(name_en, name_ar))",
      )
      .eq("user_id", userId)
      .neq("response", "declined")
      .eq("meetings.status", "scheduled")
      .gte("meetings.starts_at", cairoInstant(date).toISOString())
      .lt("meetings.starts_at", cairoInstant(addDaysTo(date, 1)).toISOString()),
  ) as unknown as MeetingRow[];

  return rows
    .filter((r) => new Date(r.meetings.ends_at) > now)
    .map(({ response, meetings: m }) => ({
      id: m.id,
      title: { en: m.title, ar: m.title_ar || m.title },
      startsAt: m.starts_at,
      endsAt: m.ends_at,
      room: localized(m.meeting_rooms) ?? (m.location_text ? { en: m.location_text, ar: m.location_text } : null),
      online: !!m.online_url,
      response,
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

type ShootRow = {
  role: string;
  call_time: string | null;
  shoots: {
    id: string;
    title: string;
    shoot_on: string;
    call_time: string;
    location_name: string | null;
    branches: NameRow;
  };
};

/** Shoots today or tomorrow with this person on the crew. */
export async function loadShoots(client: Client, userId: string, date: string): Promise<ShootItem[]> {
  const rows = must(
    await client
      .from("shoot_crew")
      .select("role, call_time, shoots!inner(id, title, shoot_on, call_time, location_name, branches(name_en, name_ar))")
      .eq("user_id", userId)
      .in("shoots.shoot_on", [date, addDaysTo(date, 1)])
      .in("shoots.status", ["planned", "confirmed"])
      .is("shoots.archived_at", null),
  ) as unknown as ShootRow[];

  return rows
    .map(({ role, call_time, shoots: s }) => ({
      id: s.id,
      title: s.title,
      when: s.shoot_on === date ? ("today" as const) : ("tomorrow" as const),
      callTime: (call_time ?? s.call_time).slice(0, 5),
      place: s.location_name ? { en: s.location_name, ar: s.location_name } : localized(s.branches),
      role,
    }))
    .sort((a, b) => a.when.localeCompare(b.when) || a.callTime.localeCompare(b.callTime));
}

/** Today's birthdays and anniversaries, for a signed-in staff member. */
export async function loadCelebrations(client: Client, date: string): Promise<CelebrationItem[]> {
  const rows = must(await client.rpc("upcoming_celebrations", { p_from: date, p_days: 0 }));
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.display_name,
    kind: r.kind === "anniversary" ? ("anniversary" as const) : ("birthday" as const),
    years: r.years,
  }));
}

type SessionRow = {
  checked_in_at: string;
  checked_out_at: string | null;
  method: NonNullable<CheckinState["method"]>;
  checkin_place: string | null;
  branches: NameRow;
};

/** Whether the person is checked in now, already left today, or has not arrived. */
export async function loadCheckin(client: Client, userId: string, date: string): Promise<CheckinState> {
  const startOfDay = cairoInstant(date).toISOString();
  const rows = must(
    await client
      .from("attendance_sessions")
      .select("checked_in_at, checked_out_at, method, checkin_place, branches(name_en, name_ar)")
      .eq("user_id", userId)
      .or(`checked_out_at.is.null,checked_in_at.gte.${startOfDay}`)
      .order("checked_in_at", { ascending: false })
      .limit(1),
  ) as unknown as SessionRow[];

  const last = rows[0];
  if (!last) return { status: "none", at: null, method: null, place: null };
  const place = localized(last.branches) ?? (last.checkin_place ? { en: last.checkin_place, ar: last.checkin_place } : null);
  return last.checked_out_at
    ? { status: "out", at: last.checked_out_at, method: last.method, place }
    : { status: "in", at: last.checked_in_at, method: last.method, place };
}
