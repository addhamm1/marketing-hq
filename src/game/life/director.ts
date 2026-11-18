import type { CharacterStatus } from "../types";
import { Agent, type AgentPose } from "./agent";
import { chatSpots, findPartner } from "./chat";
import { CONTROL_RESUME_MS, MEET_HOLD_MS, endHold, extendHold, isHeld, jump, nextStop, routeFor, steer } from "./control";
import { type NavGrid, type Tile, isWalkable, tileKey } from "./grid";
import { findPath } from "./path";
import type { Places, Spot } from "./places";
import { type ActivityKind, activityDuration, bubbleFor, chooseActivity, propFor } from "./plan";
import { between } from "./rng";
import { canHappen, pickSpot } from "./spots";

export type AgentInput = { id: string; status: CharacterStatus; home: Spot };

const MAX_STEP_MS = 100; // a hidden tab resumes without characters teleporting
const CHAT_WAIT_MS = 12_000;
const BUBBLE_MS = 1_600;

/**
 * Runs everyone's day: picks activities biased by status, walks characters
 * there on the grid, pairs people up for chats, and pops speech bubbles.
 * Deterministic for a given seed and sequence of calls; no Phaser, no clock.
 */
export class Director {
  private readonly agents = new Map<string, Agent>();
  /** Tile key -> agent id, for destinations other than a character's own desk. */
  private readonly reserved = new Map<string, string>();
  private now = 0;
  private motion = true;

  constructor(
    private readonly grid: NavGrid,
    private readonly places: Places,
    private readonly seed = 1,
  ) {}

  /** Add, update and remove agents to match the latest character list. */
  sync(inputs: AgentInput[]): void {
    const seen = new Set<string>();
    for (const input of inputs) {
      seen.add(input.id);
      const agent = this.agents.get(input.id);
      if (!agent) {
        this.add(input);
        continue;
      }
      const homeMoved = agent.home.x !== input.home.x || agent.home.y !== input.home.y;
      if (agent.status === input.status && !homeMoved) continue;
      agent.status = input.status;
      agent.home = input.home;
      if (!this.motion && !isHeld(agent)) agent.teleportHome(this.grid);
      this.interrupt(agent);
    }
    for (const id of [...this.agents.keys()]) if (!seen.has(id)) this.remove(id);
  }

  /** Reduced motion: everyone stands at home with an idle loop. */
  setMotion(on: boolean): void {
    if (this.motion === on) return;
    this.motion = on;
    for (const agent of this.agents.values()) {
      this.endChat(agent);
      this.release(agent);
      // Someone who was sent somewhere stays there; everyone else goes home.
      if (isHeld(agent)) {
        jump(agent, this.grid, agent.target, this.now, 0);
        continue;
      }
      agent.teleportHome(this.grid);
      agent.phase = "do";
      agent.activity = on ? "work" : "wander";
      agent.prop = null;
      agent.bubble = null;
      agent.until = this.now + (on ? between(agent.rng, 500, 4_000) : Infinity);
    }
  }

  /**
   * A person sends this character to `tile`. The simulation leaves it alone
   * until `holdMs` pass without another command. Under reduced motion it
   * appears there instead of walking. False when the tile can't be reached.
   */
  command(id: string, tile: Tile, holdMs = CONTROL_RESUME_MS): boolean {
    const agent = this.agents.get(id);
    if (!agent || !isWalkable(this.grid, tile.x, tile.y)) return false;
    const spot: Spot = { x: tile.x, y: tile.y, face: "down" };
    if (!this.motion) {
      this.leaveActivity(agent);
      jump(agent, this.grid, spot, this.now, holdMs);
      return true;
    }
    const path = routeFor(agent, this.grid, spot);
    if (!path) return false;
    this.leaveActivity(agent);
    steer(agent, path, spot, this.now, holdMs);
    return true;
  }

  /** Show a character on its saved tile, without walking there. */
  place(id: string, tile: Tile, holdMs = CONTROL_RESUME_MS): boolean {
    const agent = this.agents.get(id);
    if (!agent || !isWalkable(this.grid, tile.x, tile.y)) return false;
    this.leaveActivity(agent);
    jump(agent, this.grid, { x: tile.x, y: tile.y, face: "down" }, this.now, holdMs);
    return true;
  }

  /** Stand still for a moment (a dance, a clap), stopping at the next tile when walking. */
  hold(id: string, ms: number): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    this.leaveActivity(agent);
    if (agent.phase === "walk") {
      const stop = nextStop(agent);
      steer(agent, [stop], { x: stop.x, y: stop.y, face: agent.face }, this.now, ms);
      return;
    }
    agent.phase = "do";
    extendHold(agent, this.now, ms);
  }

  /** Two people walk up to each other. False when they can't (reduced motion, no room, not on this map). */
  meet(a: string, b: string, holdMs = MEET_HOLD_MS): boolean {
    const first = this.agents.get(a);
    const second = this.agents.get(b);
    if (!first || !second || first === second || !this.motion) return false;
    const [left, right] = nextStop(first).x <= nextStop(second).x ? [first, second] : [second, first];
    const spots = chatSpots(this.grid, nextStop(left), nextStop(right), new Set(this.reserved.keys()));
    if (!spots) return false;
    const leftPath = routeFor(left, this.grid, spots[0]);
    const rightPath = routeFor(right, this.grid, spots[1]);
    if (!leftPath || !rightPath) return false;
    this.leaveActivity(left);
    this.leaveActivity(right);
    steer(left, leftPath, spots[0], this.now, holdMs);
    steer(right, rightPath, spots[1], this.now, holdMs);
    return true;
  }

  /** True once the character has stopped walking (or isn't on this map). */
  arrived(id: string): boolean {
    return this.agents.get(id)?.phase !== "walk";
  }

  /** True while a person controls this character. */
  controlled(id: string): boolean {
    const agent = this.agents.get(id);
    return !!agent && isHeld(agent);
  }

  /** Freeze one character (its popover is open) or nobody. */
  setPaused(id: string | null): void {
    for (const agent of this.agents.values()) agent.paused = agent.id === id;
  }

  pose(id: string): AgentPose | null {
    const agent = this.agents.get(id);
    if (!agent) return null;
    const pose = agent.pose();
    return this.motion ? pose : { ...pose, anim: "idle", face: "down", bubble: null, prop: null };
  }

  tick(dtMs: number): void {
    if (!this.motion) return;
    const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS);
    this.now += dt;
    for (const agent of this.agents.values()) {
      if (agent.paused) continue;
      if (agent.phase === "walk") {
        if (agent.advance(this.grid, dt)) this.arrive(agent);
      } else if (isHeld(agent)) {
        if (this.now >= agent.heldUntil) endHold(agent, this.now);
      } else if (this.now >= agent.until) {
        if (agent.phase === "wait") this.endChat(agent);
        this.plan(agent);
      } else if (agent.phase === "do") {
        this.bubbles(agent);
      }
    }
  }

  private add(input: AgentInput): void {
    const agent = new Agent(input.id, input.status, input.home, this.grid, this.seed);
    agent.activity = input.status === "away" ? "sleep" : "work";
    if (agent.activity === "sleep") {
      agent.bubble = "zzz";
      agent.face = "down";
    }
    // Stagger the first decision so people don't all get up at once.
    agent.until = this.now + between(agent.rng, 1_000, input.status === "focus" ? 20_000 : 9_000);
    this.agents.set(input.id, agent);
  }

  private remove(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    this.endChat(agent);
    this.release(agent);
    this.agents.delete(id);
  }

  /** Status or desk changed: stop what you're doing (at the next tile when walking) and plan again. */
  private interrupt(agent: Agent): void {
    this.endChat(agent);
    if (isHeld(agent)) return;
    if (agent.phase === "walk") agent.replan = true;
    else agent.until = this.now;
  }

  private plan(agent: Agent): void {
    this.release(agent);
    agent.replan = false;
    agent.bubble = null;
    const kind = chooseActivity(agent.status, agent.rng, (k) => this.possible(k));
    if (this.stay(agent, kind)) return;
    if (kind === "chat" && this.startChat(agent)) return;
    if (kind === "work" || kind === "sleep" || kind === "chat") {
      this.go(agent, kind === "chat" ? "work" : kind, agent.home);
      return;
    }
    const spot = this.freeSpot(agent, kind);
    if (!spot || !this.go(agent, kind, spot)) this.go(agent, agent.status === "away" ? "sleep" : "work", agent.home);
  }

  /** Same activity again and already in place: keep the spot instead of hopping to another one. */
  private stay(agent: Agent, kind: ActivityKind): boolean {
    const placed = agent.phase === "do" && agent.tile.x === agent.target.x && agent.tile.y === agent.target.y;
    if (kind !== agent.activity || kind === "wander" || kind === "chat" || !placed) return false;
    if (agent.target !== agent.home) this.reserved.set(tileKey(agent.target), agent.id);
    if (kind === "sleep") agent.bubble = "zzz";
    agent.until = this.now + activityDuration(kind, agent.rng, agent.status);
    return true;
  }

  private possible(kind: ActivityKind): boolean {
    return canHappen(this.places, kind);
  }

  private freeSpot(agent: Agent, kind: ActivityKind): Spot | null {
    return pickSpot(this.places, kind, agent.rng, (s) => this.reserved.has(tileKey(s)));
  }

  /** Walk to `spot` to do `kind` there. Returns false when the spot can't be reached. */
  private go(agent: Agent, kind: ActivityKind, spot: Spot): boolean {
    const path = findPath(this.grid, agent.tile, spot);
    if (!path) {
      // Nowhere to go: stay put doing the thing on the spot.
      agent.activity = kind;
      agent.phase = "do";
      agent.until = this.now + activityDuration(kind, agent.rng, agent.status);
      return kind === "work" || kind === "sleep";
    }
    agent.activity = kind;
    agent.target = spot;
    if (spot !== agent.home) this.reserved.set(tileKey(spot), agent.id);
    agent.path = path;
    agent.step = 1;
    agent.prop = null;
    agent.phase = "walk";
    if (path.length <= 1) this.arrive(agent);
    return true;
  }

  private arrive(agent: Agent): void {
    if (isHeld(agent)) {
      agent.path = [];
      agent.phase = "do";
      agent.face = agent.target.face;
      return;
    }
    if (agent.replan) {
      this.plan(agent);
      return;
    }
    agent.path = [];
    // Sleepers slump facing the room; everyone else faces the desk, counter or partner.
    agent.face = agent.activity === "sleep" ? "down" : agent.target.face;
    agent.prop = propFor(agent.activity, agent.rng);
    agent.nextBubble = this.now + between(agent.rng, 400, 2_500);
    agent.bubble = agent.activity === "sleep" ? "zzz" : null;
    if (agent.activity === "chat") {
      const partner = agent.partner ? this.agents.get(agent.partner) : undefined;
      agent.phase = "wait";
      // Stood up: give up straight away.
      agent.until = partner ? this.now + CHAT_WAIT_MS : this.now;
      if (partner?.phase === "wait") {
        const end = this.now + activityDuration("chat", agent.rng);
        for (const a of [agent, partner]) {
          a.phase = "do";
          a.until = end;
        }
        partner.nextBubble = this.now + 1_800;
      }
      return;
    }
    agent.phase = "do";
    agent.until = this.now + activityDuration(agent.activity, agent.rng, agent.status);
  }

  private startChat(agent: Agent): boolean {
    const partner = findPartner(agent, this.agents.values());
    if (!partner) return false;
    const spots = chatSpots(this.grid, agent.tile, partner.tile, new Set(this.reserved.keys()));
    if (!spots) return false;
    // The one on the left takes the left tile.
    const [left, right] = agent.tile.x <= partner.tile.x ? [agent, partner] : [partner, agent];
    if (!findPath(this.grid, left.tile, spots[0]) || !findPath(this.grid, right.tile, spots[1])) return false;
    this.release(partner);
    left.partner = right.id;
    right.partner = left.id;
    this.go(left, "chat", spots[0]);
    this.go(right, "chat", spots[1]);
    return true;
  }

  /** Leave a chat; the partner (if any) plans something else. */
  private endChat(agent: Agent): void {
    const partner = agent.partner ? this.agents.get(agent.partner) : undefined;
    agent.partner = null;
    if (!partner || partner.partner !== agent.id) return;
    partner.partner = null;
    if (partner.phase === "walk") partner.replan = true;
    else partner.until = this.now;
  }

  /** Drop whatever the simulation had this character doing. */
  private leaveActivity(agent: Agent): void {
    this.endChat(agent);
    this.release(agent);
  }

  private release(agent: Agent): void {
    const key = tileKey(agent.target);
    if (this.reserved.get(key) === agent.id) this.reserved.delete(key);
  }

  private bubbles(agent: Agent): void {
    if (agent.activity === "sleep") return;
    if (agent.bubble && this.now >= agent.bubbleUntil) agent.bubble = null;
    if (this.now < agent.nextBubble) return;
    agent.bubble = bubbleFor(agent.activity, agent.rng);
    agent.bubbleUntil = this.now + BUBBLE_MS;
    agent.nextBubble = this.now + between(agent.rng, 2_600, 5_200);
    const partner = agent.partner ? this.agents.get(agent.partner) : undefined;
    // Take turns talking.
    if (partner && agent.bubble) partner.nextBubble = Math.max(partner.nextBubble, this.now + BUBBLE_MS + 200);
  }
}
