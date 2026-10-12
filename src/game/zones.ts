import Phaser from "phaser";

import type { Rect } from "./life/grid";

export type ZoneRect = Rect;

/** Desk and standing-spot zones are where characters stand, and team pods only carry a sign: none is a navigation target. */
export function isFeatureZone(name: string): boolean {
  return !/^(desk|spot)-\d+$/.test(name) && !name.startsWith("pod-");
}

/** Read rectangles from the `zones` object layer. */
export function readZones(map: Phaser.Tilemaps.Tilemap): ZoneRect[] {
  const layer = map.getObjectLayer("zones");
  if (!layer) return [];
  return layer.objects
    .filter((o) => o.name && (o.width ?? 0) > 0 && (o.height ?? 0) > 0)
    .map((o) => ({ name: o.name, x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? 0, height: o.height ?? 0 }));
}

const HIGHLIGHT_COLOR = 0xffffff;
const ZONE_DEPTH = 3;
const HIGHLIGHT_DEPTH = 4;

/**
 * Clickable feature zones with a soft rounded outline on hover (desktop) or
 * press (touch). A pointer-up that ended a drag or pinch is not a click.
 */
export class ZoneLayer {
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly objects: Phaser.GameObjects.Zone[] = [];
  private hideTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    zones: ZoneRect[],
    private readonly isGesture: () => boolean,
    private readonly onClick?: (zoneName: string) => void,
  ) {
    this.highlight = scene.add.graphics().setDepth(HIGHLIGHT_DEPTH).setVisible(false);
    for (const rect of zones) {
      if (!isFeatureZone(rect.name)) continue;
      const zone = scene.add
        .zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height)
        .setDepth(ZONE_DEPTH)
        .setInteractive({ useHandCursor: Boolean(onClick) });
      zone.on("pointerover", () => this.show(rect));
      zone.on("pointerout", () => this.hide());
      zone.on("pointerdown", () => this.show(rect));
      zone.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        if (pointer.wasTouch) this.hideSoon();
        if (!this.isGesture()) this.onClick?.(rect.name);
      });
      this.objects.push(zone);
    }
  }

  private show(rect: ZoneRect): void {
    this.hideTimer?.remove();
    this.hideTimer = null;
    const inset = 2;
    this.highlight
      .clear()
      .fillStyle(HIGHLIGHT_COLOR, 0.1)
      .fillRoundedRect(rect.x + inset, rect.y + inset, rect.width - inset * 2, rect.height - inset * 2, 6)
      .lineStyle(1.5, HIGHLIGHT_COLOR, 0.85)
      .strokeRoundedRect(rect.x + inset, rect.y + inset, rect.width - inset * 2, rect.height - inset * 2, 6)
      .setVisible(true);
  }

  private hide(): void {
    this.highlight.setVisible(false);
  }

  private hideSoon(): void {
    this.hideTimer?.remove();
    this.hideTimer = this.scene.time.delayedCall(300, () => this.hide());
  }

  destroy(): void {
    this.hideTimer?.remove();
    for (const zone of this.objects) zone.destroy();
    this.objects.length = 0;
    this.highlight.destroy();
  }
}
