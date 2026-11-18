import type { BubbleKind } from "./life/plan";
import type { MapInteractionKind } from "./types";

/**
 * What each interaction looks like on the map. Dances and claps are made from
 * movement and overlays only, so every avatar sheet works as it is. Pure.
 */

export type EmoteKind = MapInteractionKind | "celebrate";
export type EmoteMoves = "dance" | "clap";
export type Emote = { bubble: BubbleKind; ms: number; moves?: EmoteMoves };

export const EMOTES: Record<EmoteKind, Emote> = {
  wave: { bubble: "wave", ms: 1_800 },
  high_five: { bubble: "highFive", ms: 1_600 },
  coffee: { bubble: "coffee", ms: 2_200 },
  chat: { bubble: "chat", ms: 2_200 },
  dance: { bubble: "music", ms: 3_600, moves: "dance" },
  clap: { bubble: "clap", ms: 2_400, moves: "clap" },
  celebrate: { bubble: "heart", ms: 2_400 },
};

/** The other person answers a beat later, so the two read as an exchange. */
export const REPLY_DELAY_MS = 450;

/** Sideways sway and hop of the body, in whole world pixels, `elapsed` ms into the emote. */
export function bodyOffset(moves: EmoteMoves, elapsed: number): { x: number; y: number } {
  if (moves === "dance") {
    return { x: Math.round(Math.sin(elapsed / 150) * 2), y: -Math.round(Math.abs(Math.sin(elapsed / 110)) * 2) };
  }
  return { x: 0, y: -Math.round(Math.abs(Math.sin(elapsed / 90))) };
}
