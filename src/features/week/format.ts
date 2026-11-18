import { CAIRO, cairoInstant } from "@/lib/dates";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A date or instant as Cairo sees it, with month names in the reader's language. */
export function formatCairoDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) {
  const instant = DATE_ONLY.test(value) ? cairoInstant(value, "12:00") : new Date(value);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { timeZone: CAIRO, ...options }).format(instant);
}
