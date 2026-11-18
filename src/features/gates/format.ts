// Dates are formatted from their calendar value in UTC, so a date never shifts by
// a day in the browser. Arabic keeps Western digits, like the rest of the app.

const tag = (locale: string) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");
const at = (date: string) => new Date(`${date}T12:00:00Z`);

function fmt(locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: "UTC", ...options });
}

export function formatMonth(month: string, locale: string): string {
  return fmt(locale, { month: "long", year: "numeric" }).format(at(`${month}-15`));
}

export function formatDay(date: string, locale: string): string {
  return fmt(locale, { day: "numeric", month: "short" }).format(at(date));
}

export function formatWeekdayDay(date: string, locale: string): string {
  return fmt(locale, { weekday: "short", day: "numeric", month: "short" }).format(at(date));
}

/** "5 Nov", "6–20 Nov", or "28 Nov – 2 Dec" across a month end. */
export function formatRange(start: string, end: string, locale: string): string {
  if (start === end) return formatDay(start, locale);
  if (start.slice(0, 7) === end.slice(0, 7)) {
    const month = fmt(locale, { month: "short" }).format(at(end));
    return `${Number(start.slice(8))}–${Number(end.slice(8))} ${month}`;
  }
  return `${formatDay(start, locale)} – ${formatDay(end, locale)}`;
}

/** Narrow weekday letter for the day ruler. */
export function narrowWeekday(date: string, locale: string): string {
  return fmt(locale, { weekday: "narrow" }).format(at(date));
}

/** Weekday name for a stored weekday number (0 = Sunday). 4 Jan 2026 is a Sunday. */
export function weekdayName(weekday: number, locale: string): string {
  return fmt(locale, { weekday: "short" }).format(new Date(Date.UTC(2026, 0, 4 + weekday, 12)));
}
