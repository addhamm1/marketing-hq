import type { ShootStatus } from "./schemas";

/** Upcoming: still to happen, soonest first. Past: everything else, latest first. */
export function splitShoots<T extends { shoot_on: string; status: ShootStatus }>(rows: readonly T[], today: string) {
  const isUpcoming = (s: T) => s.shoot_on >= today && (s.status === "planned" || s.status === "confirmed");
  return {
    upcoming: rows.filter(isUpcoming).sort((a, b) => a.shoot_on.localeCompare(b.shoot_on)),
    past: rows.filter((s) => !isUpcoming(s)).sort((a, b) => b.shoot_on.localeCompare(a.shoot_on)),
  };
}

/** The list with one item moved up or down; unchanged at either end. */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const next = [...items];
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export type KitItem = { en: string; ar: string; quantity: number };

export const DEFAULT_KIT: readonly KitItem[] = [
  { en: "Camera body", ar: "بودي الكاميرا", quantity: 1 },
  { en: "Lenses", ar: "عدسات", quantity: 2 },
  { en: "Tripod", ar: "حامل ثلاثي", quantity: 1 },
  { en: "Gimbal", ar: "جيمبال", quantity: 1 },
  { en: "Lights", ar: "إضاءة", quantity: 2 },
  { en: "Microphone", ar: "مايك", quantity: 1 },
  { en: "Batteries", ar: "بطاريات", quantity: 4 },
  { en: "Memory cards", ar: "كروت ميموري", quantity: 2 },
];

/** Default kit items not on the list yet, in either language, so a second tap adds nothing. */
export function missingKit(existing: readonly string[]): KitItem[] {
  const have = new Set(existing.map((i) => i.trim().toLowerCase()));
  return DEFAULT_KIT.filter((k) => !have.has(k.en.toLowerCase()) && !have.has(k.ar));
}

/** Database time ("09:00:00") as shown to people ("09:00"). */
export function shortTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

/** A date-only value, formatted without a time-zone shift. */
export function formatShootDate(day: string, locale: string, style: "long" | "short" = "long") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

/** Where to open the shoot on a map: its own link, else the branch's point. */
export function shootMapLink(url: string | null, branch?: { latitude: number | null; longitude: number | null } | null) {
  if (url) return url;
  if (branch?.latitude != null && branch.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
  }
  return null;
}

/** Escapes LIKE wildcards in text typed by a person. */
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}
