import type Phaser from "phaser";

import type { Direction, ManifestAnimation } from "./avatar/types";
import type { Anim } from "./life/plan";

/**
 * Per-character animations built from the 6x4 avatar sheet (rows are
 * directions; columns 0-1 idle, 2-5 walk). Typing, dancing and sleeping are
 * made from the same frames: no extra art needed, so bought art packs and
 * existing avatars keep working.
 */

export type SheetInfo = {
  canvas: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  idle: ManifestAnimation;
  walk: ManifestAnimation;
  directions: Direction[];
};

const DIRECTIONS: Direction[] = ["down", "left", "right", "up"];
const TYPE_RATE = 6;
const DANCE_RATE = 6;

export function animKey(anim: Anim, face: Direction): string {
  if (anim === "dance" || anim === "sleep") return anim;
  return `${anim}-${face}`;
}

export function buildAnimations(sprite: Phaser.GameObjects.Sprite, key: string, info: SheetInfo): void {
  const columns = Math.max(1, Math.floor(info.canvas.width / info.frameWidth));
  const rowOf = (dir: Direction) => {
    const row = info.directions.indexOf(dir);
    return row >= 0 ? row : Math.max(0, info.directions.indexOf("down"));
  };
  const frames = (dir: Direction, list: number[]) => list.map((f) => ({ key, frame: rowOf(dir) * columns + f }));
  const idle = info.idle.frames.length ? info.idle.frames : [0];
  const walk = info.walk.frames.length ? info.walk.frames : idle;

  const anims = sprite.anims;
  const add = (animKeyName: string, list: { key: string; frame: number }[], frameRate: number) => {
    anims.remove(animKeyName);
    anims.create({ key: animKeyName, frames: list, frameRate, repeat: -1 });
  };
  for (const dir of DIRECTIONS) {
    add(`idle-${dir}`, frames(dir, idle), info.idle.frameRate);
    add(`walk-${dir}`, frames(dir, walk), info.walk.frameRate);
    add(`type-${dir}`, frames(dir, idle), TYPE_RATE);
  }
  // Dance: step left, face front, step right, face front.
  add(
    "dance",
    [
      ...frames("left", walk.slice(0, 2)),
      ...frames("down", idle.slice(0, 1)),
      ...frames("right", walk.slice(0, 2)),
      ...frames("down", idle.slice(-1)),
    ],
    DANCE_RATE,
  );
  add("sleep", frames("down", idle.slice(0, 1)), 1);
}
