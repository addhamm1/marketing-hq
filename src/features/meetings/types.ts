import type { Database } from "@/lib/supabase/database.types";

export type Area = "team" | "portal";
export type MeetingTab = "upcoming" | "fixed" | "past";
export type AttendeeResponse = Database["public"]["Enums"]["attendee_response"];
export type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
export type Cadence = Database["public"]["Enums"]["meeting_cadence"];

export type Room = {
  id: string;
  name_en: string;
  name_ar: string;
  capacity: number;
  branch_id: string | null;
  is_active: boolean;
};

export type Branch = { id: string; name_en: string; name_ar: string };

export type Attendee = { user_id: string; response: AttendeeResponse };

export type MeetingListItem = {
  id: string;
  series_id: string | null;
  title: string;
  title_ar: string | null;
  starts_at: string;
  ends_at: string;
  status: MeetingStatus;
  is_private: boolean;
  location_text: string | null;
  online_url: string | null;
  organizer_id: string | null;
  meeting_rooms: { name_en: string; name_ar: string } | null;
  meeting_attendees: Attendee[];
};

export type Guest = { id: string; name: string; email: string; invited_at: string | null };

export type ActionItem = {
  id: string;
  title: string;
  assignee_id: string | null;
  due_on: string | null;
  done: boolean;
  card_id: string | null;
};

export type MeetingDetail = MeetingListItem & {
  agenda: string;
  notes: string;
  room_id: string | null;
  guests: Guest[];
  actions: ActionItem[];
};

export type Series = {
  id: string;
  title: string;
  title_ar: string | null;
  agenda: string;
  cadence: Cadence;
  weekdays: number[];
  month_days: number[];
  start_time: string;
  duration_minutes: number;
  room_id: string | null;
  online_url: string | null;
  owner_id: string | null;
  audience: "marketing" | "custom";
  starts_on: string;
  ends_on: string | null;
  member_ids: string[];
  next_on: string | null;
};

/** What the meeting form needs that the shell's people list does not carry. */
export type FormOptions = { rooms: Room[]; marketingDepartments: string[]; me: string };

/** The result of saving a meeting, so the organiser hears about undelivered invitations. */
export type SaveMeetingResult = { id: string; invited: number; failed: number };
