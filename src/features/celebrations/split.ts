import type { Celebration } from "./types";

/** Today's celebrations go in the banner, the rest in the upcoming list. */
export function splitCelebrations(all: Celebration[], today: string) {
  return {
    today: all.filter((c) => c.day === today),
    upcoming: all.filter((c) => c.day > today),
  };
}

/** Whole days from one YYYY-MM-DD date to another; safe across clock changes. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
