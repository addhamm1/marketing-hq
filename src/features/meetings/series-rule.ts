import { cairoDateString, formatCairo } from "@/lib/dates";

export type SeriesRule = {
  cadence: "daily" | "weekly" | "monthly";
  weekdays: number[];
  month_days: number[];
  start_time: string;
  starts_on: string;
  ends_on: string | null;
};

/** Saturday first, the way the work week runs. Friday is off. */
export const WORK_WEEK = [6, 0, 1, 2, 3, 4] as const;

const LOOK_AHEAD_DAYS = 400;

const toUtc = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const toDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toDate(d);
};
const weekday = (date: string) => toUtc(date).getUTCDay();

function isWorkday(date: string, holidays: ReadonlySet<string>) {
  return weekday(date) !== 5 && !holidays.has(date);
}

function rollBack(date: string, holidays: ReadonlySet<string>) {
  let d = date;
  while (!isWorkday(d, holidays)) d = addDays(d, -1);
  return d;
}

/** The dates of one month a monthly rule lands on, as `_series_dates` picks them. */
function monthDates(year: number, month: number, days: number[], holidays: ReadonlySet<string>) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return days.map((day) => rollBack(toDate(new Date(Date.UTC(year, month, Math.min(day, last)))), holidays));
}

/**
 * The next date a fixed meeting falls on, matching the database rule: working
 * days only, a monthly day past the month's end becomes its last day, and a
 * monthly day on a day off moves back to the closest working day.
 */
export function nextSeriesDate(rule: SeriesRule, now: Date = new Date(), holidays: ReadonlySet<string> = new Set()): string | null {
  const today = cairoDateString(now);
  const clock = formatCairo(now, "HH:mm");
  const first = rule.starts_on > today ? rule.starts_on : today;
  const open = (d: string) => d >= first && (!rule.ends_on || d <= rule.ends_on) && (d > today || rule.start_time.slice(0, 5) > clock);

  if (rule.cadence !== "monthly") {
    for (let i = 0; i < LOOK_AHEAD_DAYS; i++) {
      const d = addDays(first, i);
      if (rule.ends_on && d > rule.ends_on) return null;
      const dayMatches = rule.weekdays.length === 0 || rule.weekdays.includes(weekday(d));
      if (isWorkday(d, holidays) && dayMatches && open(d)) return d;
    }
    return null;
  }

  const start = toUtc(first);
  for (let i = 0; i < 14; i++) {
    const found = monthDates(start.getUTCFullYear(), start.getUTCMonth() + i, rule.month_days, holidays).filter(open).sort();
    if (found.length) return found[0];
  }
  return null;
}

function weekdayName(day: number, locale: string) {
  // 2026-11-15 is a Sunday.
  const date = new Date(Date.UTC(2026, 10, 15 + day));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(date);
}

export function weekdayLabels(locale: string) {
  return WORK_WEEK.map((day) => ({ day, label: weekdayName(day, locale) }));
}

/** The chosen weekdays in work-week order, as names. */
export function weekdayList(days: number[], locale: string) {
  return WORK_WEEK.filter((d) => days.includes(d)).map((d) => weekdayName(d, locale));
}
