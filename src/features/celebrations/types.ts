import type { KudosBadge } from "./schemas";

export type Kudos = {
  id: string;
  from_id: string;
  to_id: string;
  badge: KudosBadge;
  message: string;
  created_at: string;
};

export type Celebration = {
  user_id: string;
  display_name: string;
  kind: "birthday" | "anniversary";
  /** The day it falls on this year, YYYY-MM-DD. Birth years are never collected. */
  day: string;
  years: number | null;
};

/** The newest kudos shown first; "Show more" adds this many each time. */
export const KUDOS_PAGE = 30;
/** How far ahead the upcoming list looks. */
export const UPCOMING_DAYS = 30;
