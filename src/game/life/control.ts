import type { Agent } from "./agent";
import { type NavGrid, type Tile, feetOf, inBounds, isWalkable, nearestTile } from "./grid";
import { findPath } from "./path";
import type { Spot } from "./places";

/**
 * A person, not the simulation, decides what a held character does. The hold
 * lapses after a period without new input and the character goes back to its
 * day. Pure state changes on an Agent: no Phaser, no clock.
 */

/** How long a character waits for its next command before living its own life again. */
export const CONTROL_RESUME_MS = 45_000;
/** Long enough for two people to walk over and high-five. */
export const MEET_HOLD_MS = 20_000;

export function isHeld(agent: Pick<Agent, "heldUntil">): boolean {
  return agent.heldUntil > 0;
}

/** Keep the character under control until at least `now + ms`. Later input only ever extends it. */
export function extendHold(agent: Agent, now: number, ms: number): void {
  agent.heldUntil = Math.max(agent.heldUntil, now + ms);
  agent.until = agent.heldUntil;
}

/** Hand the character back to the simulation, which plans its next move straight away. */
export function endHold(agent: Agent, now: number): void {
  agent.heldUntil = 0;
  agent.until = now;
}

/** The tile a character can change course from: the one it is stepping onto, or the one it stands on. */
export function nextStop(agent: Agent): Tile {
  return agent.phase === "walk" ? (agent.path[agent.step] ?? agent.tile) : agent.tile;
}

/** The route from where the character can turn, or null when `spot` cannot be reached. */
export function routeFor(agent: Agent, grid: NavGrid, spot: Tile): Tile[] | null {
  return findPath(grid, nextStop(agent), spot);
}

/** Start walking `path`. Step 0 is the tile being stepped onto, so nobody cuts a corner through a wall. */
export function steer(agent: Agent, path: Tile[], spot: Spot, now: number, holdMs: number): void {
  agent.replan = false;
  agent.activity = "wander";
  agent.target = spot;
  agent.prop = null;
  agent.bubble = null;
  agent.path = path;
  agent.step = 0;
  agent.phase = "walk";
  extendHold(agent, now, holdMs);
}

/** Appear on `spot` without walking: saved positions, and everyone under reduced motion. */
export function jump(agent: Agent, grid: NavGrid, spot: Spot, now: number, holdMs: number): void {
  const feet = feetOf(grid, spot);
  agent.x = feet.x;
  agent.y = feet.y;
  agent.tile = { x: spot.x, y: spot.y };
  agent.face = spot.face;
  agent.target = spot;
  agent.path = [];
  agent.step = 0;
  agent.replan = false;
  agent.activity = "wander";
  agent.prop = null;
  agent.bubble = null;
  agent.phase = "do";
  extendHold(agent, now, holdMs);
}

/**
 * Where a tap on `tile` sends someone: the tile itself, or a walkable tile
 * touching it, because a fingertip on a phone easily lands on a desk edge.
 */
export function resolveFloorTap(grid: NavGrid, tile: Tile): Tile | null {
  if (!inBounds(grid, tile.x, tile.y)) return null;
  if (isWalkable(grid, tile.x, tile.y)) return tile;
  return nearestTile(grid, tile, () => true, 5);
}
