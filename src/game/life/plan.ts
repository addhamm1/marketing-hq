import type { CharacterStatus } from "../types";
import type { PlaceKind } from "./places";
import { type Rng, between, pick, weighted } from "./rng";

/**
 * What characters do, and how their presence status biases it. Pure tables
 * and functions; the director applies them.
 */

export type ActivityKind = "work" | "sleep" | "coffee" | "chat" | "dance" | "lounge" | "call" | "meeting" | "shoot" | "wander";
export type Anim = "idle" | "walk" | "type" | "dance" | "sleep";
export type Prop = "coffee" | "phone" | "camera";
export type BubbleKind = "chat" | "laugh" | "coffee" | "idea" | "heart" | "music" | "zzz" | "phone" | "camera" | "wave" | "highFive" | "clap";

/** Relative weights per status. Status wins: focus stays at the desk, meeting goes to the meeting room. */
export const ACTIVITY_WEIGHTS: Record<CharacterStatus, Partial<Record<ActivityKind, number>>> = {
  available: { work: 46, coffee: 10, chat: 16, wander: 12, lounge: 6, dance: 4, call: 6 },
  focus: { work: 1 },
  meeting: { meeting: 6, call: 1 },
  shoot: { shoot: 1 },
  break: { coffee: 30, dance: 20, lounge: 22, chat: 22, wander: 6 },
  away: { sleep: 1 },
};

/** Used when nothing in the weights is possible on this map (a map without a studio, say). */
export const FALLBACK: Record<CharacterStatus, ActivityKind> = {
  available: "work",
  focus: "work",
  meeting: "work",
  shoot: "work",
  break: "wander",
  away: "sleep",
};

/** Place each activity happens in; `seat` prefers chairs and sofas, `floor` standing room. */
export const ACTIVITY_PLACE: Partial<Record<ActivityKind, { kind: PlaceKind; on: "seat" | "floor" | "any" }>> = {
  coffee: { kind: "cafe", on: "floor" },
  lounge: { kind: "lounge", on: "seat" },
  dance: { kind: "lounge", on: "floor" },
  call: { kind: "booth", on: "any" },
  meeting: { kind: "meeting", on: "seat" },
  shoot: { kind: "studio", on: "floor" },
};

const DURATIONS: Record<ActivityKind, [number, number]> = {
  work: [9_000, 22_000],
  sleep: [20_000, 40_000],
  coffee: [6_000, 12_000],
  chat: [6_000, 11_000],
  dance: [5_000, 10_000],
  lounge: [8_000, 16_000],
  call: [9_000, 18_000],
  meeting: [16_000, 30_000],
  shoot: [12_000, 24_000],
  wander: [1_500, 4_000],
};

/** Activities that may be interrupted by a colleague who wants to chat. */
export const CHATTY: ReadonlySet<ActivityKind> = new Set(["work", "wander", "coffee", "lounge"]);
/** Statuses that accept a chat. */
export const SOCIAL: ReadonlySet<CharacterStatus> = new Set(["available", "break"]);

export function chooseActivity(status: CharacterStatus, rng: Rng, can: (kind: ActivityKind) => boolean): ActivityKind {
  return weighted(rng, ACTIVITY_WEIGHTS[status], can) ?? FALLBACK[status];
}

export function activityDuration(kind: ActivityKind, rng: Rng, status?: CharacterStatus): number {
  const [min, max] = DURATIONS[kind];
  // Focused people work in long stretches.
  const scale = kind === "work" && status === "focus" ? 2 : 1;
  return Math.round(between(rng, min, max) * scale);
}

export function animFor(kind: ActivityKind, walking: boolean): Anim {
  if (walking) return "walk";
  if (kind === "work") return "type";
  if (kind === "sleep") return "sleep";
  if (kind === "dance") return "dance";
  return "idle";
}

export function propFor(kind: ActivityKind, rng: Rng): Prop | null {
  if (kind === "coffee") return "coffee";
  if (kind === "call") return "phone";
  if (kind === "shoot") return "camera";
  if (kind === "lounge") return rng() < 0.5 ? "coffee" : null;
  return null;
}

const BUBBLES: Partial<Record<ActivityKind, BubbleKind[]>> = {
  chat: ["chat", "laugh", "idea", "heart", "coffee", "chat", "laugh"],
  coffee: ["coffee"],
  dance: ["music"],
  call: ["phone", "chat"],
  meeting: ["chat", "idea"],
  shoot: ["camera"],
  lounge: ["chat", "laugh", "music"],
  work: ["idea"],
};

/** Chance that a bubble shows when its turn comes, per activity (work rarely pops ideas). */
const BUBBLE_CHANCE: Partial<Record<ActivityKind, number>> = { work: 0.12, lounge: 0.3, meeting: 0.5 };

export function bubbleFor(kind: ActivityKind, rng: Rng): BubbleKind | null {
  if (kind === "sleep") return "zzz";
  const options = BUBBLES[kind];
  if (!options) return null;
  return rng() < (BUBBLE_CHANCE[kind] ?? 1) ? (pick(rng, options) ?? null) : null;
}
