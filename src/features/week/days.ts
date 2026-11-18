// Calendar arithmetic on YYYY-MM-DD strings. These are dates, not instants, so
// no clock or time zone is involved; "today" always comes from src/lib/dates.ts.
const DAY_MS = 86_400_000;

function toMs(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDaysTo(date: string, days: number) {
  return new Date(toMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

/** 0 = Sunday … 5 = Friday, 6 = Saturday. */
export function weekdayOf(date: string) {
  return new Date(toMs(date)).getUTCDay();
}

/** The Saturday that opens the work week holding `date`. */
export function weekStartOf(date: string) {
  return addDaysTo(date, -((weekdayOf(date) + 1) % 7));
}

/** The week to open by default. Friday is off, so it already looks ahead to Saturday. */
export function currentWeekStart(today: string) {
  return weekdayOf(today) === 5 ? addDaysTo(today, 1) : weekStartOf(today);
}

/** Saturday to Thursday. */
export function weekDays(start: string) {
  return Array.from({ length: 6 }, (_, i) => addDaysTo(start, i));
}

/** A real calendar date in YYYY-MM-DD form, or null. */
export function parseDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = toMs(value);
  return Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== value ? null : value;
}
