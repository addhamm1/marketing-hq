import { TZDate } from "@date-fns/tz";
import { addDays, format, isFriday } from "date-fns";

// All business logic about "today", lateness and deadlines runs in Cairo time.
// Egypt observes summer time, so never hardcode a UTC offset.
export const CAIRO = "Africa/Cairo";

export function nowInCairo(now: Date = new Date()): TZDate {
  return new TZDate(now.getTime(), CAIRO);
}

/** Calendar date (YYYY-MM-DD) in Cairo for an instant. */
export function cairoDateString(instant: Date = new Date()): string {
  return format(nowInCairo(instant), "yyyy-MM-dd");
}

/** The instant for a wall-clock time on a Cairo calendar date. */
export function cairoInstant(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, CAIRO).getTime());
}

export function cairoHour(instant: Date = new Date()): number {
  return nowInCairo(instant).getHours();
}

/** Work week is Saturday to Thursday; Friday is off. */
export function isWorkingDay(date: string, holidays: ReadonlySet<string> = new Set()): boolean {
  const d = cairoInstant(date, "12:00");
  return !isFriday(nowInCairo(d)) && !holidays.has(date);
}

/** Working days between two Cairo dates, inclusive, skipping Fridays and holidays. */
export function countWorkingDays(
  from: string,
  to: string,
  holidays: ReadonlySet<string> = new Set(),
): number {
  if (to < from) return 0;
  let count = 0;
  let cursor = from;
  while (cursor <= to) {
    if (isWorkingDay(cursor, holidays)) count++;
    cursor = cairoDateString(addDays(cairoInstant(cursor, "12:00"), 1));
  }
  return count;
}

export function formatCairo(instant: Date | string, pattern: string): string {
  return format(nowInCairo(new Date(instant)), pattern);
}

/** ISO instant → value for <input type="datetime-local"> in Cairo time. */
export function toCairoInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return format(nowInCairo(new Date(iso)), "yyyy-MM-dd'T'HH:mm");
}

/** <input type="datetime-local"> value read as Cairo time → ISO instant. */
export function fromCairoInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const [date, time] = value.split("T");
  if (!date || !time) return null;
  return cairoInstant(date, time.slice(0, 5)).toISOString();
}
