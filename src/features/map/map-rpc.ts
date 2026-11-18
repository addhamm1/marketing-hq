import type { MapInteractionKind, MapTile } from "@/game";
import { createClient } from "@/lib/supabase/browser";
import { type InteractError, interactErrorOf } from "./events";
import type { MapPositionRow } from "./types";

export type MoveResult = "sent" | "limited" | "not_checked_in" | "failed";

/** Save and announce the viewer's position. The function checks the check-in and sends the event itself. */
export async function sendMove(branchId: string, tile: MapTile): Promise<MoveResult> {
  const { data, error } = await createClient().rpc("map_move", { p_branch_id: branchId, p_x: tile.x, p_y: tile.y });
  if (error) return error.message.includes("not_checked_in") ? "not_checked_in" : "failed";
  return data ? "sent" : "limited";
}

/** Returns why the interaction was refused, or null when it went through. */
export async function sendInteraction(to: string | null, kind: MapInteractionKind): Promise<InteractError | null> {
  // The generated type marks the target as required; an empty target is how a solo emote is sent.
  const { error } = await createClient().rpc("map_interact", { p_to: to as string, p_kind: kind });
  return error ? interactErrorOf(error.message) : null;
}

export async function fetchPositions(): Promise<MapPositionRow[] | null> {
  const { data, error } = await createClient().from("map_positions").select("user_id, branch_id, tile_x, tile_y");
  return error ? null : data;
}
