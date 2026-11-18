// Egypt's public holidays, used by the launch checklist to spot gaps in the holiday list.
// Same dates as supabase/seed/04_portal.sql and supabase/seed-production.sql.

const FIXED = ["01-07", "01-25", "04-25", "05-01", "06-30", "07-23", "10-06"];

// Expected dates: moon-dependent holidays are confirmed by sighting, and Sham El Nessim follows
// Coptic Easter. Extend this list when the seed gets a new year.
const MOVABLE = [
  "2027-03-10", "2027-03-11", "2027-03-12", // Eid al-Fitr
  "2027-05-03", // Sham El Nessim
  "2027-05-15", // Arafat Day
  "2027-05-16", "2027-05-17", "2027-05-18", // Eid al-Adha
  "2027-06-06", // Islamic New Year
  "2027-08-15", // Prophet's Birthday
];

/** Days either side a listed holiday may sit: sighting and cabinet decisions move dates. */
const TOLERANCE_DAYS = 3;
const DAY_MS = 86_400_000;

const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** The same calendar date one year later, as YYYY-MM-DD. */
export function oneYearAfter(day: string) {
  return `${Number(day.slice(0, 4)) + 1}${day.slice(4)}`;
}

/** Expected public holidays from `from` to `to`, inclusive. */
export function expectedHolidays(from: string, to: string) {
  const years: number[] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) years.push(y);
  const fixed = years.flatMap((y) => FIXED.map((md) => `${y}-${md}`));
  return [...fixed, ...MOVABLE].filter((d) => d >= from && d <= to).sort();
}

/**
 * Expected days with no holiday listed. An exact date counts first; what is left can be
 * matched by a nearby listed day, each listed day counting once.
 */
export function missingHolidays(expected: readonly string[], listed: readonly string[]) {
  const unused = new Set(listed);
  const open = expected.filter((day) => !unused.delete(day));
  return open.filter((day) => {
    const near = [...unused].find((d) => Math.abs(toUtc(d) - toUtc(day)) <= TOLERANCE_DAYS * DAY_MS);
    if (near) unused.delete(near);
    return !near;
  });
}
