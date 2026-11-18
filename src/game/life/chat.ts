import type { Agent } from "./agent";
import { type NavGrid, type Tile, isSeat, isWalkable, nearestTile, tileKey } from "./grid";
import type { Spot } from "./places";
import { CHATTY, SOCIAL } from "./plan";

/** How far apart (in tiles, Manhattan) two people can be and still go for a chat. */
export const CHAT_RANGE = 16;

/** Can `other` be pulled into a chat right now? */
export function canChat(other: Agent): boolean {
  return (
    !other.paused &&
    other.heldUntil === 0 &&
    other.partner === null &&
    SOCIAL.has(other.status) &&
    other.phase === "do" &&
    CHATTY.has(other.activity)
  );
}

/** Closest colleague willing to chat with `agent`, within range. */
export function findPartner(agent: Agent, others: Iterable<Agent>): Agent | null {
  let best: Agent | null = null;
  let bestDistance = Infinity;
  for (const other of others) {
    if (other === agent || !canChat(other)) continue;
    const d = Math.abs(other.tile.x - agent.tile.x) + Math.abs(other.tile.y - agent.tile.y);
    if (d <= CHAT_RANGE && d < bestDistance) {
      best = other;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * Two side-by-side free floor tiles near the midpoint between `a` and `b`,
 * so the pair can stand face to face. Seats and reserved tiles are skipped.
 */
export function chatSpots(grid: NavGrid, a: Tile, b: Tile, reserved: ReadonlySet<string>): [Spot, Spot] | null {
  const free = (x: number, y: number) => isWalkable(grid, x, y) && !isSeat(grid, x, y) && !reserved.has(tileKey({ x, y }));
  const mid = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
  const left = nearestTile(grid, mid, (t) => free(t.x, t.y) && free(t.x + 1, t.y));
  if (!left) return null;
  return [
    { x: left.x, y: left.y, face: "right" },
    { x: left.x + 1, y: left.y, face: "left" },
  ];
}
