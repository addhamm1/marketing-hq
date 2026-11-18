import type { CharacterStatus } from "../types";
import { type Facing, type NavGrid, type Tile, feetOf } from "./grid";
import type { Spot } from "./places";
import { type ActivityKind, type Anim, type BubbleKind, type Prop, animFor } from "./plan";
import { type Rng, hashSeed, mulberry32 } from "./rng";

/** Walking speed in world pixels per second (about 1.1 tiles a second). */
export const WALK_SPEED = 36;

/** What the renderer needs for one character on one frame. */
export type AgentPose = {
  x: number;
  y: number;
  face: Facing;
  anim: Anim;
  prop: Prop | null;
  bubble: BubbleKind | null;
  activity: ActivityKind;
};

export type Phase = "walk" | "wait" | "do";

/** One character's mutable simulation state. Driven by the Director. */
export class Agent {
  readonly rng: Rng;
  x: number;
  y: number;
  tile: Tile;
  face: Facing;
  path: Tile[] = [];
  /** Index in `path` of the tile being walked to. */
  step = 0;
  phase: Phase = "do";
  activity: ActivityKind = "work";
  target: Spot;
  until = 0;
  partner: string | null = null;
  prop: Prop | null = null;
  bubble: BubbleKind | null = null;
  bubbleUntil = 0;
  nextBubble = 0;
  /** Stop at the next tile and plan again (status changed mid-walk). */
  replan = false;
  paused = false;
  /** Director time until which a person controls this character; 0 means the simulation does. */
  heldUntil = 0;

  constructor(
    readonly id: string,
    public status: CharacterStatus,
    public home: Spot,
    grid: NavGrid,
    seed: number,
  ) {
    this.rng = mulberry32(hashSeed(id) ^ seed);
    const feet = feetOf(grid, home);
    this.x = feet.x;
    this.y = feet.y;
    this.tile = { x: home.x, y: home.y };
    this.face = home.face;
    this.target = home;
  }

  /** Put the character back on its home tile without walking. */
  teleportHome(grid: NavGrid): void {
    const feet = feetOf(grid, this.home);
    this.x = feet.x;
    this.y = feet.y;
    this.tile = { x: this.home.x, y: this.home.y };
    this.face = this.home.face;
    this.target = this.home;
    this.path = [];
    this.step = 0;
  }

  /**
   * Move along the path by `dt` milliseconds. Returns true when the walk is
   * over: the last tile was reached, or `replan` asked to stop at a tile.
   */
  advance(grid: NavGrid, dt: number): boolean {
    let budget = (WALK_SPEED * dt) / 1000;
    while (budget > 0) {
      const next = this.path[this.step];
      if (!next) return true;
      const goal = feetOf(grid, next);
      const dx = goal.x - this.x;
      const dy = goal.y - this.y;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist > 0) this.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      if (dist > budget) {
        // Paths are 4-directional, so one axis at a time.
        if (dx !== 0) this.x += Math.sign(dx) * Math.min(budget, Math.abs(dx));
        else this.y += Math.sign(dy) * Math.min(budget, Math.abs(dy));
        return false;
      }
      budget -= dist;
      this.x = goal.x;
      this.y = goal.y;
      this.tile = { x: next.x, y: next.y };
      this.step++;
      if (this.replan || this.step >= this.path.length) return true;
    }
    return false;
  }

  pose(): AgentPose {
    const walking = this.phase === "walk" && !this.paused;
    return {
      x: this.x,
      y: this.y,
      face: this.face,
      anim: this.paused ? "idle" : animFor(this.activity, walking),
      prop: walking ? null : this.prop,
      bubble: this.paused ? null : this.bubble,
      activity: this.activity,
    };
  }
}
