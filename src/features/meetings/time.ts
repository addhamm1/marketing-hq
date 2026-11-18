import { cairoDateString, cairoInstant, CAIRO, formatCairo } from "@/lib/dates";

export type BusyRow = { kind: string; id: string; starts_at: string; ends_at: string };

/** The saved slot of the meeting being edited: it must not count against itself. */
export type OwnSlot = { starts_at: string; ends_at: string; room_id: string | null; attendee_ids: string[] };

const HALF_HOUR = 30 * 60_000;

/** Start and end instants from a Cairo date, a Cairo time and a length in minutes. */
export function meetingRange(date: string, time: string, minutes: number) {
  const start = cairoInstant(date, time);
  return { starts_at: start.toISOString(), ends_at: new Date(start.getTime() + minutes * 60_000).toISOString() };
}

/** Form values for a saved meeting. */
export function rangeToForm(startsAt: string, endsAt: string) {
  return {
    date: formatCairo(startsAt, "yyyy-MM-dd"),
    time: formatCairo(startsAt, "HH:mm"),
    duration: Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000),
  };
}

/** The next half hour in Cairo, which rolls over to tomorrow near midnight. */
export function nextSlot(now: Date = new Date()) {
  const slot = new Date(Math.ceil(now.getTime() / HALF_HOUR) * HALF_HOUR);
  return { date: cairoDateString(slot), time: formatCairo(slot, "HH:mm") };
}

/** Rooms and people taken in a period, leaving out the meeting being edited. */
export function busyIds(rows: BusyRow[], kind: "room" | "user", own?: OwnSlot | null): Set<string> {
  const out = new Set<string>();
  const skipped = new Set<string>();
  const start = own ? Date.parse(own.starts_at) : NaN;
  const end = own ? Date.parse(own.ends_at) : NaN;
  const mine = (id: string) => (kind === "room" ? own?.room_id === id : !!own?.attendee_ids.includes(id));
  for (const row of rows) {
    if (row.kind !== kind) continue;
    const same = Date.parse(row.starts_at) === start && Date.parse(row.ends_at) === end;
    // One row per person belongs to this meeting; a second one at the same time is a real clash.
    if (same && mine(row.id) && !skipped.has(row.id)) {
      skipped.add(row.id);
      continue;
    }
    out.add(row.id);
  }
  return out;
}

function intlLocale(locale: string) {
  return locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
}

/** "Thu 20 Nov" in the reader's language, always on the Cairo calendar. */
export function formatDay(iso: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", day: "numeric", month: "short", timeZone: CAIRO }).format(new Date(iso));
}

/** "Thursday 20 November 2026", for headings and emails. */
export function formatLongDay(iso: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: CAIRO }).format(new Date(iso));
}

/** "10:00 – 10:30" in Cairo time. */
export function formatTimeRange(startsAt: string, endsAt: string) {
  return `${formatCairo(startsAt, "HH:mm")} – ${formatCairo(endsAt, "HH:mm")}`;
}
