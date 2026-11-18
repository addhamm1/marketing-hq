import Phaser from "phaser";

import { bubbleKey, propKey } from "./activity-art";
import type { Direction } from "./avatar/types";
import { type SheetInfo, animKey, buildAnimations } from "./character-anims";
import { gameFonts } from "./fonts";
import type { AgentPose } from "./life/agent";
import type { BubbleKind, Prop } from "./life/plan";
import { LEAVE_SIGN_KEY, SHADOW_KEY, statusKey } from "./textures";
import type { MapCharacter } from "./types";

export type { SheetInfo } from "./character-anims";

const HEAD_OFFSET = 28; // feet to top of head, in world px

/** Where a prop sits relative to the feet, per facing; null hides it (behind the body). */
const PROP_AT: Record<Prop, Partial<Record<Direction, [number, number]>>> = {
  coffee: { down: [8, -9], right: [7, -9], left: [-7, -9] },
  phone: { down: [8, -19], right: [5, -19], left: [-5, -19], up: [7, -19] },
  camera: { down: [0, -14], right: [8, -15], left: [-8, -15], up: [0, -21] },
};

function readableText(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return "#ffffff";
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#040707" : "#ffffff";
}

/**
 * One character on the map: sprite + shadow + name tag + status bubble +
 * activity bubble and prop, or an on-leave sign. Owns its per-user texture
 * and removes it on destroy. Positions come from the Director every frame.
 */
export class CharacterView {
  readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly prop: Phaser.GameObjects.Image;
  private readonly sign: Phaser.GameObjects.Image;
  private textureKey: string | null = null;
  private sheet: HTMLCanvasElement | null = null;
  private version = 0;
  private statusValue: MapCharacter["status"] | null = null;
  private anim = "";
  private bubbleKind: BubbleKind | null = null;
  private propState = "";
  /** Reduced motion: bubbles appear without popping in. */
  calm = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly userId: string,
    onPress: (view: CharacterView) => void,
  ) {
    this.shadow = scene.add.image(0, -1, SHADOW_KEY);
    this.sprite = scene.add.sprite(0, 0, SHADOW_KEY).setOrigin(0.5, 1);
    this.prop = scene.add.image(0, 0, SHADOW_KEY).setOrigin(0.5, 1).setVisible(false);
    this.sign = scene.add.image(0, 0, LEAVE_SIGN_KEY).setOrigin(0.5, 1).setVisible(false);
    this.status = scene.add.image(7, -HEAD_OFFSET + 1, statusKey("available")).setOrigin(0.5, 1);
    this.bubble = scene.add.image(-7, -HEAD_OFFSET - 1, SHADOW_KEY).setOrigin(0.5, 1).setVisible(false);
    this.label = scene.add
      .text(0, 2, "", { fontFamily: gameFonts().name, fontSize: "8px", fontStyle: "700", padding: { x: 3, y: 1 }, resolution: 4 })
      .setOrigin(0.5, 0);
    this.container = scene.add.container(0, 0, [this.shadow, this.sprite, this.prop, this.sign, this.status, this.bubble, this.label]);
    for (const target of [this.sprite, this.sign]) {
      target.setInteractive({ useHandCursor: true });
      target.on("pointerup", () => onPress(this));
    }
  }

  /** Apply data (sheet, name, status, leave sign). Position is set by `render` or `place`. */
  update(c: MapCharacter, sheet: SheetInfo, isNew: boolean): void {
    this.setSheet(sheet);
    this.setLabel(c.name, c.teamColor);
    this.setStatus(c.status, isNew);
    const leave = Boolean(c.onLeave);
    this.sprite.setVisible(!leave);
    this.shadow.setVisible(!leave);
    this.status.setVisible(!leave);
    this.sign.setVisible(leave);
    if (leave) this.setBubble(null);
    if (leave) this.setProp(null, "down");
  }

  /** Stand still at a spot (leave signs, maps without a walk grid). */
  place(x: number, y: number, isNew: boolean): void {
    this.render({ x, y, face: "down", anim: "idle", prop: null, bubble: null, activity: "work" }, 0);
    if (isNew) this.fadeIn();
  }

  /** Draw one frame of the pose computed by the Director; `shift` moves the body alone (dances, claps). */
  render(pose: AgentPose, time: number, shift?: { x: number; y: number } | null): void {
    const x = Math.round(pose.x);
    const y = Math.round(pose.y);
    if (x !== this.container.x || y !== this.container.y) this.container.setPosition(x, y).setDepth(10 + y);
    const key = animKey(pose.anim, pose.face);
    if (key !== this.anim && this.sprite.anims.exists(key)) {
      this.sprite.anims.play(key, true);
      this.anim = key;
    }
    const bob = pose.anim === "dance" ? -Math.round(Math.abs(Math.sin(time / 140)) * 2) : 0;
    this.sprite.setPosition(shift?.x ?? 0, bob + (shift?.y ?? 0));
    this.setProp(pose.prop, pose.face);
    this.setBubble(pose.bubble);
  }

  fadeIn(): void {
    this.container.setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 300 });
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

  /** World position of the top of the head, where effects start from. */
  headPoint(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y - HEAD_OFFSET };
  }

  /** Stop reacting to clicks (used while fading out). */
  disable(): void {
    this.sprite.disableInteractive();
    this.sign.disableInteractive();
  }

  refreshLabel(resolution?: number): void {
    if (resolution && resolution !== this.label.style.resolution) this.label.setResolution(resolution);
    else this.label.updateText();
  }

  private setProp(prop: Prop | null, face: Direction): void {
    const state = `${prop}:${face}`;
    if (state === this.propState) return;
    this.propState = state;
    const at = prop ? PROP_AT[prop][face] : undefined;
    if (!prop || !at) {
      this.prop.setVisible(false);
      return;
    }
    this.prop.setTexture(propKey(prop)).setPosition(at[0], at[1]).setFlipX(face === "left").setVisible(true);
    // Behind the body when facing away, in front otherwise.
    if (face === "up") this.container.moveBelow(this.prop, this.sprite);
    else this.container.moveAbove(this.prop, this.sprite);
  }

  private setBubble(kind: BubbleKind | null): void {
    if (kind === this.bubbleKind) return;
    this.bubbleKind = kind;
    this.scene.tweens.killTweensOf(this.bubble);
    if (!kind) {
      this.bubble.setVisible(false);
      return;
    }
    this.bubble.setTexture(bubbleKey(kind)).setVisible(true).setScale(this.calm ? 1 : 0.4);
    if (this.calm) return;
    this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 160, ease: "Back.easeOut" });
  }

  private setLabel(name: string, teamColor: string): void {
    if (this.label.text === name && this.label.style.backgroundColor === teamColor) return;
    this.label.setText(name);
    this.label.setBackgroundColor(teamColor);
    this.label.setColor(readableText(teamColor));
    // Arabic names render right without setRTL, which in Phaser 3.90 draws off-canvas at resolution > 1.
  }

  private setStatus(status: MapCharacter["status"], isNew: boolean): void {
    if (status === this.statusValue) return;
    this.statusValue = status;
    this.status.setTexture(statusKey(status));
    if (!isNew) this.scene.tweens.add({ targets: this.status, scale: { from: 1.4, to: 1 }, duration: 180, ease: "Back.easeOut" });
  }

  /** Build a texture from the composed canvas; skipped when the canvas is the same object as before. */
  private setSheet(info: SheetInfo): void {
    if (info.canvas === this.sheet) return;
    const textures = this.scene.textures;
    const key = `avatar:${this.userId}:${++this.version}`;
    const canvasTexture = textures.addCanvas(key, info.canvas);
    if (!canvasTexture) return;
    textures.addSpriteSheet(key, canvasTexture, { frameWidth: info.frameWidth, frameHeight: info.frameHeight });
    this.sprite.anims.stop();
    buildAnimations(this.sprite, key, info);
    this.sprite.setTexture(key, 0);
    this.anim = "";
    if (this.textureKey) textures.remove(this.textureKey);
    this.textureKey = key;
    this.sheet = info.canvas;
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.container, this.status, this.bubble]);
    this.container.destroy();
    if (this.textureKey) this.scene.textures.remove(this.textureKey);
    this.textureKey = null;
    this.sheet = null;
  }
}
