import Phaser from "phaser";

import type { ManifestAnimation } from "./avatar/types";
import { LEAVE_SIGN_KEY, SHADOW_KEY, statusKey } from "./textures";
import type { MapCharacter } from "./types";

export const NAME_FONT = '"IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif';
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const HEAD_OFFSET = 28; // feet to top of head, in world px

export type SheetInfo = {
  canvas: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  idle: ManifestAnimation;
  downRow: number;
};

function readableText(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return "#ffffff";
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#13232c" : "#ffffff";
}

/**
 * One character on the map: sprite + shadow + name tag + status bubble, or an
 * on-leave sign. Owns its per-user texture and removes it on destroy.
 */
export class CharacterView {
  readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly sign: Phaser.GameObjects.Image;
  private textureKey: string | null = null;
  private sheet: HTMLCanvasElement | null = null;
  private version = 0;
  private status: MapCharacter["status"] | null = null;
  private moveTween: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly userId: string,
    onPress: (view: CharacterView) => void,
  ) {
    this.shadow = scene.add.image(0, -1, SHADOW_KEY);
    this.sprite = scene.add.sprite(0, 0, SHADOW_KEY).setOrigin(0.5, 1);
    this.sign = scene.add.image(0, 0, LEAVE_SIGN_KEY).setOrigin(0.5, 1).setVisible(false);
    this.bubble = scene.add.image(7, -HEAD_OFFSET + 1, statusKey("available")).setOrigin(0.5, 1);
    this.label = scene.add
      .text(0, 2, "", {
        fontFamily: NAME_FONT,
        fontSize: "8px",
        fontStyle: "600",
        padding: { x: 3, y: 1 },
        resolution: 4,
      })
      .setOrigin(0.5, 0);
    this.container = scene.add.container(0, 0, [this.shadow, this.sprite, this.sign, this.bubble, this.label]);
    for (const target of [this.sprite, this.sign]) {
      target.setInteractive({ useHandCursor: true });
      target.on("pointerup", () => onPress(this));
    }
  }

  /** Apply data. `x`/`y` is where the feet go (chair), `deskY` where a leave sign stands. */
  update(c: MapCharacter, x: number, y: number, deskY: number, sheet: SheetInfo, isNew: boolean): void {
    this.setSheet(sheet);
    this.setLabel(c.name, c.teamColor);
    this.setStatus(c.status, isNew);
    const leave = Boolean(c.onLeave);
    this.sprite.setVisible(!leave);
    this.shadow.setVisible(!leave);
    this.bubble.setVisible(!leave);
    this.sign.setVisible(leave);
    this.moveTo(x, leave ? deskY : y, isNew);
  }

  /** Screen position (CSS px, relative to the canvas) of the top of the head. */
  screenPoint(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const top = this.sign.visible ? this.sign.height : HEAD_OFFSET;
    return {
      x: Math.round((this.container.x - cam.worldView.x) * cam.zoom + cam.x),
      y: Math.round((this.container.y - top - cam.worldView.y) * cam.zoom + cam.y),
    };
  }

  /** Stop reacting to clicks (used while fading out). */
  disable(): void {
    this.sprite.disableInteractive();
    this.sign.disableInteractive();
  }

  refreshLabel(): void {
    this.label.updateText();
  }

  private moveTo(x: number, y: number, isNew: boolean): void {
    if (isNew) {
      this.container.setPosition(x, y).setDepth(10 + y).setAlpha(0);
      this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 300 });
      return;
    }
    if (this.container.x === x && this.container.y === y) return;
    this.moveTween?.stop();
    this.container.setDepth(10 + Math.max(y, this.container.y));
    this.moveTween = this.scene.tweens.add({
      targets: this.container,
      x,
      y,
      duration: 600,
      ease: "Sine.easeInOut",
      onComplete: () => this.container.setDepth(10 + y),
    });
  }

  private setLabel(name: string, teamColor: string): void {
    if (this.label.text === name && this.label.style.backgroundColor === teamColor) return;
    this.label.setText(name);
    this.label.setBackgroundColor(teamColor);
    this.label.setColor(readableText(teamColor));
    this.label.setRTL(ARABIC.test(name));
  }

  private setStatus(status: MapCharacter["status"], isNew: boolean): void {
    if (status === this.status) return;
    this.status = status;
    this.bubble.setTexture(statusKey(status));
    if (!isNew) this.scene.tweens.add({ targets: this.bubble, scale: { from: 1.4, to: 1 }, duration: 180, ease: "Back.easeOut" });
  }

  /** Build a texture from the composed canvas; skipped when the canvas is the same object as before. */
  private setSheet(info: SheetInfo): void {
    if (info.canvas === this.sheet) return;
    const textures = this.scene.textures;
    const key = `avatar:${this.userId}:${++this.version}`;
    const canvasTexture = textures.addCanvas(key, info.canvas);
    if (!canvasTexture) return;
    textures.addSpriteSheet(key, canvasTexture, { frameWidth: info.frameWidth, frameHeight: info.frameHeight });
    const columns = Math.max(1, Math.floor(info.canvas.width / info.frameWidth));
    const frames = info.idle.frames.map((f) => ({ key, frame: info.downRow * columns + f }));

    this.sprite.anims.stop();
    this.sprite.anims.remove("idle");
    this.sprite.setTexture(key, frames[0]?.frame ?? 0);
    this.sprite.anims.create({ key: "idle", frames, frameRate: info.idle.frameRate, repeat: -1 });
    this.sprite.anims.play({ key: "idle", delay: Math.floor(Math.random() * 600) });

    if (this.textureKey) textures.remove(this.textureKey);
    this.textureKey = key;
    this.sheet = info.canvas;
  }

  destroy(): void {
    this.moveTween?.stop();
    this.scene.tweens.killTweensOf([this.container, this.bubble]);
    this.container.destroy();
    if (this.textureKey) this.scene.textures.remove(this.textureKey);
    this.textureKey = null;
    this.sheet = null;
  }
}
