import type { Area, MeetingListItem } from "./types";

export function meetingsBase(area: Area) {
  return area === "portal" ? "/portal/meetings" : "/meetings";
}

/** Fixed meetings can carry an Arabic title; one-off meetings have only one. */
export function meetingTitle(m: { title: string; title_ar: string | null }, locale: string) {
  return locale === "ar" && m.title_ar ? m.title_ar : m.title;
}

export function roomName(room: { name_en: string; name_ar: string } | null | undefined, locale: string) {
  if (!room) return null;
  return locale === "ar" ? room.name_ar : room.name_en;
}

/** Room, free-text place, in that order. */
export function placeLabel(m: Pick<MeetingListItem, "meeting_rooms" | "location_text">, locale: string) {
  return [roomName(m.meeting_rooms, locale), m.location_text].filter(Boolean).join(" · ");
}

/** A meeting whose time is over but which the five-minute job has not closed yet counts as held. */
export function isOver(m: Pick<MeetingListItem, "status" | "ends_at">, now: number = Date.now()) {
  return m.status === "done" || (m.status === "scheduled" && Date.parse(m.ends_at) <= now);
}
