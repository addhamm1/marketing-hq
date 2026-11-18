import { z } from "zod";

/** Realtime payloads sent by `map_move`, `map_interact` and the kudos trigger. Checked before they reach the game. */

const TILE = z.number().int().min(0).max(500);

export const INTERACTION_KINDS = ["wave", "high_five", "coffee", "chat", "dance", "clap"] as const;

export const moveEvent = z.object({ user_id: z.uuid(), x: TILE, y: TILE });

export const interactEvent = z.object({
  from: z.uuid(),
  to: z.uuid().nullable(),
  kind: z.enum(INTERACTION_KINDS),
});

export const celebrateEvent = z.object({ user_id: z.uuid() });

export type InteractError = "rate_limited" | "not_here" | "not_checked_in" | "unknown";

/** The reason `map_interact` refused, from the database error message. */
export function interactErrorOf(message: string | undefined): InteractError {
  if (message?.includes("rate_limited")) return "rate_limited";
  if (message?.includes("not_here")) return "not_here";
  if (message?.includes("not_checked_in")) return "not_checked_in";
  return "unknown";
}
