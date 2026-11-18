import type Phaser from "phaser";

import { EffectLayer } from "./effects";
import { EMOTES, REPLY_DELAY_MS } from "./emotes";
import type { AgentPose } from "./life/agent";
import type { Director } from "./life/director";
import type { MapInteraction } from "./types";

type Point = { x: number; y: number };
type Meeting = { a: string; b: string; deadline: number };

const MEET_WAIT_MS = 16_000; // nobody waits for ever for a colleague whose popover is open

/** Plays what people do to each other on the floor: emotes, high fives and confetti. */
export class InteractionPlayer {
  private readonly effects: EffectLayer;
  private meetings: Meeting[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly director: Director,
    private readonly headOf: (userId: string) => Point | null,
  ) {
    this.effects = new EffectLayer(scene);
  }

  setMotion(on: boolean): void {
    this.effects.setMotion(on);
  }

  play({ from, to, kind }: MapInteraction, time: number): void {
    if (kind === "high_five" && to) {
      if (this.director.meet(from, to)) this.meetings.push({ a: from, b: to, deadline: time + MEET_WAIT_MS });
      else this.highFive(from, to, time);
      return;
    }
    if (EMOTES[kind].moves) this.director.hold(from, EMOTES[kind].ms);
    this.effects.play(from, kind, time);
    if (to) this.effects.play(to, kind, time + REPLY_DELAY_MS);
  }

  /** Confetti over someone who just received kudos. */
  celebrate(userId: string, time: number): void {
    const head = this.headOf(userId);
    if (!head) return;
    this.effects.play(userId, "celebrate", time);
    this.effects.confetti(head);
  }

  tick(time: number): void {
    this.effects.tick(time, this.headOf);
    if (!this.meetings.length) return;
    this.meetings = this.meetings.filter((m) => {
      const together = this.director.arrived(m.a) && this.director.arrived(m.b);
      if (!together && time < m.deadline) return true;
      this.highFive(m.a, m.b, time);
      return false;
    });
  }

  dress(userId: string, pose: AgentPose, time: number): Point | null {
    return this.effects.dress(userId, pose, time);
  }

  destroy(): void {
    this.meetings = [];
    this.effects.destroy();
  }

  private highFive(a: string, b: string, time: number): void {
    this.effects.play(a, "high_five", time);
    this.effects.play(b, "high_five", time);
    const [headA, headB] = [this.headOf(a), this.headOf(b)];
    if (headA && headB) this.effects.sparkle({ x: (headA.x + headB.x) / 2, y: (headA.y + headB.y) / 2 + 8 });
  }
}
