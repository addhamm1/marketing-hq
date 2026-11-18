import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cairoDateString } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";
import { nextSeriesDate } from "./series-rule";
import type { ActionItem, Area, Branch, FormOptions, Guest, MeetingDetail, MeetingListItem, Room, Series } from "./types";

type Client = SupabaseClient<Database>;

const LIST_COLUMNS =
  "id, series_id, title, title_ar, starts_at, ends_at, status, is_private, location_text, online_url, organizer_id, meeting_rooms(name_en, name_ar), meeting_attendees(user_id, response)";
const ROOM_COLUMNS = "id, name_en, name_ar, capacity, branch_id, is_active";

/** Meetings for a tab. In the portal, only the ones this person is part of. */
export async function fetchMeetings(client: Client, tab: "upcoming" | "past", area: Area, userId: string) {
  const now = new Date().toISOString();
  const columns = area === "portal" ? `${LIST_COLUMNS}, mine:meeting_attendees!inner(user_id)` : LIST_COLUMNS;
  let query = client.from("meetings").select(columns);
  if (area === "portal") query = query.eq("mine.user_id", userId);
  query =
    tab === "upcoming"
      ? query.eq("status", "scheduled").gte("ends_at", now).order("starts_at").limit(80)
      : query.or(`status.neq.scheduled,ends_at.lt."${now}"`).order("starts_at", { ascending: false }).limit(60);
  const { data, error } = await query;
  return { meetings: (data ?? []) as unknown as MeetingListItem[], failed: !!error };
}

export async function fetchMeetingDetail(client: Client, id: string): Promise<MeetingDetail | null> {
  const { data, error } = await client.from("meetings").select(`${LIST_COLUMNS}, agenda, notes, room_id`).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [guests, actions] = await Promise.all([
    client.from("meeting_guests").select("id, name, email, invited_at").eq("meeting_id", id).order("created_at"),
    client.from("meeting_actions").select("id, title, assignee_id, due_on, done, card_id").eq("meeting_id", id).order("created_at"),
  ]);
  if (guests.error) throw guests.error;
  if (actions.error) throw actions.error;
  return {
    ...(data as unknown as Omit<MeetingDetail, "guests" | "actions">),
    guests: (guests.data ?? []) as Guest[],
    actions: (actions.data ?? []) as ActionItem[],
  };
}

export async function fetchRooms(client: Client): Promise<Room[]> {
  const { data, error } = await client.from("meeting_rooms").select(ROOM_COLUMNS).order("name_en");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFormOptions(client: Client, me: string): Promise<FormOptions> {
  const [rooms, departments] = await Promise.all([
    fetchRooms(client),
    client.from("departments").select("id").eq("is_marketing", true),
  ]);
  return { rooms, marketingDepartments: (departments.data ?? []).map((d) => d.id), me };
}

export async function fetchBranches(client: Client): Promise<Branch[]> {
  const { data } = await client.from("branches").select("id, name_en, name_ar").eq("is_active", true).order("name_en");
  return data ?? [];
}

/** Active fixed meetings with their members and the next date each one falls on. */
export async function fetchSeries(client: Client): Promise<{ series: Series[]; failed: boolean }> {
  const today = cairoDateString();
  const [rows, members, holidays] = await Promise.all([
    client
      .from("meeting_series")
      .select("id, title, title_ar, agenda, cadence, weekdays, month_days, start_time, duration_minutes, room_id, online_url, owner_id, audience, starts_on, ends_on")
      .eq("is_active", true)
      .order("start_time"),
    client.from("meeting_series_members").select("series_id, user_id"),
    client.from("holidays").select("day, is_half_day").gte("day", today),
  ]);
  if (rows.error) return { series: [], failed: true };
  const closed = new Set((holidays.data ?? []).filter((h) => !h.is_half_day).map((h) => h.day));
  const series = (rows.data ?? []).map((s) => ({
    ...s,
    audience: s.audience as Series["audience"],
    member_ids: (members.data ?? []).filter((m) => m.series_id === s.id).map((m) => m.user_id),
    next_on: nextSeriesDate(s, new Date(), closed),
  }));
  return { series, failed: false };
}
