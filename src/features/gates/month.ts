// Calendar arithmetic on plain YYYY-MM and YYYY-MM-DD strings, so nothing here
// depends on the time zone of the machine it runs on.

export type MonthInfo = { month: string; first: string; last: string; days: number };

/** ensure_gate_month opens months up to this far from today. */
export const MONTH_REACH = 12;

const pad = (n: number) => String(n).padStart(2, "0");

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
}

export function monthInfo(month: string): MonthInfo {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { month, first: `${month}-01`, last: `${month}-${pad(days)}`, days };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`;
}

/** Whole months from `from` to `to`; negative when `to` is earlier. */
export function monthsApart(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** The month to show for a `?month=` value: anything unusable falls back to this month. */
export function resolveMonth(value: unknown, today: string): string {
  const current = today.slice(0, 7);
  if (!isMonth(value)) return current;
  return Math.abs(monthsApart(current, value)) <= MONTH_REACH ? value : current;
}

export function daysBetween(from: string, to: string): number {
  const at = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((at(to) - at(from)) / 86_400_000);
}

export function dateOfDay(info: MonthInfo, day: number): string {
  return `${info.month}-${pad(day)}`;
}

/** 0 = Sunday ... 6 = Saturday, matching the weekdays stored on templates. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The day of the month a date falls on, held to the edges of the month. */
export function clampDay(date: string, info: MonthInfo): number {
  if (date < info.first) return 1;
  if (date > info.last) return info.days;
  return Number(date.slice(8));
}
