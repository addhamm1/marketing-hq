import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;

/** A name stored in both languages; the reader's locale picks one. */
export type Localized = { en: string; ar: string };

/** One part of the briefing. `ok: false` means this part failed to load. */
export type Section<T> = { ok: boolean; items: T[] };

export type MeetingItem = {
  id: string;
  title: Localized;
  startsAt: string;
  endsAt: string;
  room: Localized | null;
  online: boolean;
  response: "pending" | "accepted" | "tentative";
};

export type CardItem = {
  id: string;
  boardId: string;
  title: string;
  dueAt: string;
  overdue: boolean;
};

export type ApprovalItem = {
  stepId: string;
  kind: "card" | "request";
  title: Localized;
  since: string;
};

export type GateItem = {
  id: string;
  name: Localized;
  dueOn: string;
  daysLeft: number;
  month: string;
  atRisk: boolean;
};

export type ShootItem = {
  id: string;
  title: string;
  when: "today" | "tomorrow";
  callTime: string;
  place: Localized | null;
  role: string;
};

export type ActionItem = {
  id: string;
  title: string;
  meetingId: string;
  meetingTitle: Localized | null;
  dueOn: string | null;
  overdue: boolean;
};

export type CelebrationItem = {
  userId: string;
  name: string;
  kind: "birthday" | "anniversary";
  years: number | null;
};

export type MyDay = {
  meetings: Section<MeetingItem>;
  cards: Section<CardItem>;
  approvals: Section<ApprovalItem>;
  gates: Section<GateItem>;
  shoots: Section<ShootItem>;
  actions: Section<ActionItem>;
  celebrations: Section<CelebrationItem>;
};

export type CheckinState = {
  status: "in" | "out" | "none";
  at: string | null;
  method: Database["public"]["Enums"]["checkin_method"] | null;
  place: Localized | null;
};
