import type Phaser from "phaser";

import { PARTICLE_KEY } from "./activity-art";
import { EMOTES, type EmoteKind, bodyOffset } from "./emotes";
import type { AgentPose } from "./life/agent";

const FX_DEPTH = 5_000; // above every character (10 + y)
const CONFETTI_COUNT = 22;
const SPARKLE_COUNT = 3;
const SPARKLE_EVERY_MS = 420;
const MAX_ALIVE = 70; // a floor full of celebrations must not cost a phone its frame rate
const CONFETTI_COLORS = [0xf7d139, 0xfaa41a, 0xd62c27, 0x2d6372, 0xffffff];

type Playing = { kind: EmoteKind; start: number; nextSparkle: number };
type Point = { x: number; y: number };

/**
 * Emotes running on characters, plus one shared particle emitter for confetti
 * and sparkles. Under reduced motion only the still bubble is shown.
 */
export class EffectLayer {
  private readonly playing = new Map<string, Playing>();
  private readonly particles: Phaser.GameObjects.Particles.ParticleEmitter;
  private motion = true;

  constructor(scene: Phaser.Scene) {
    this.particles = scene.add
      .particles(0, 0, PARTICLE_KEY, {
        emitting: false,
        lifespan: { min: 550, max: 1_000 },
        speed: { min: 35, max: 95 },
        angle: { min: 205, max: 335 },
        gravityY: 170,
        alpha: { start: 1, end: 0.2 },
        scale: { min: 0.5, max: 1 },
        tint: CONFETTI_COLORS,
        maxAliveParticles: MAX_ALIVE,
      })
      .setDepth(FX_DEPTH);
  }

  setMotion(on: boolean): void {
    this.motion = on;
  }

  play(userId: string, kind: EmoteKind, start: number): void {
    this.playing.set(userId, { kind, start, nextSparkle: start });
  }

  /** Put the running emote on this frame's pose. Returns how far to shift the body, if at all. */
  dress(userId: string, pose: AgentPose, time: number): Point | null {
    const fx = this.playing.get(userId);
    if (!fx || time < fx.start) return null;
    const emote = EMOTES[fx.kind];
    const elapsed = time - fx.start;
    if (elapsed >= emote.ms) {
      this.playing.delete(userId);
      return null;
    }
    pose.bubble = emote.bubble;
    if (!this.motion || !emote.moves || pose.anim === "walk") return null;
    if (emote.moves === "dance") pose.anim = "dance";
    return bodyOffset(emote.moves, elapsed);
  }

  /** Sparkles over anyone clapping. `headOf` is null for people no longer on the map. */
  tick(time: number, headOf: (userId: string) => Point | null): void {
    if (!this.motion) return;
    for (const [userId, fx] of this.playing) {
      if (EMOTES[fx.kind].moves !== "clap" || time < fx.nextSparkle) continue;
      fx.nextSparkle = time + SPARKLE_EVERY_MS;
      const head = headOf(userId);
      if (head) this.particles.explode(SPARKLE_COUNT, head.x, head.y + 8);
    }
  }

  confetti(at: Point): void {
    if (this.motion) this.particles.explode(CONFETTI_COUNT, at.x, at.y);
  }

  sparkle(at: Point): void {
    if (this.motion) this.particles.explode(SPARKLE_COUNT * 2, at.x, at.y);
  }

  destroy(): void {
    this.playing.clear();
    this.particles.destroy();
  }
}
