import { CAIRO, cairoDateString } from "@/lib/dates";
import type { Localized } from "./types";

// Latin digits match the rest of the app, in both languages.
const intlLocale = (locale: string) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");

/** "Wednesday 18 November" in the reader's language, on the Cairo calendar. */
export function longDate(instant: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: CAIRO,
  }).format(instant);
}

/** "18 Nov" for a plain YYYY-MM-DD calendar date. */
export function shortDay(date: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

/** 24-hour Cairo time, "14:05". */
export function clock(instant: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: CAIRO,
  }).format(new Date(instant));
}

/** When a late card was due: the time if that was today, otherwise the day. */
export function lateSince(dueAt: string, now: Date, locale: string): string {
  const day = cairoDateString(new Date(dueAt));
  return day === cairoDateString(now) ? clock(dueAt) : shortDay(day, locale);
}

/** Calendar arithmetic on YYYY-MM-DD strings. Noon UTC keeps clock changes out of it. */
export function addDaysTo(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export function pick(value: Localized, locale: string): string {
  return locale === "ar" ? value.ar || value.en : value.en || value.ar;
}

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPart(cairoHour: number): DayPart {
  if (cairoHour < 12) return "morning";
  return cairoHour < 17 ? "afternoon" : "evening";
}
