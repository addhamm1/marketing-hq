import type Phaser from "phaser";

import { CharacterView, type SheetInfo } from "./character-view";
import type { ZoneRect } from "./zones";
import type { MapCharacter } from "./types";

type Options = {
  sheetFor: (character: MapCharacter) => SheetInfo;
  isGesture: () => boolean;
  onClick?: (userId: string, screen: { x: number; y: number }) => void;
};

/** Keeps one CharacterView per user in sync with the latest list (add, update, remove). */
export class CharacterManager {
  private readonly views = new Map<string, CharacterView>();
  private readonly leaving = new Set<CharacterView>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly zones: Map<string, ZoneRect>,
    private readonly options: Options,
  ) {}

  set(characters: MapCharacter[]): void {
    const seen = new Set<string>();
    for (const c of characters) {
      const zone = this.zones.get(c.spot);
      if (!zone || seen.has(c.userId)) continue;
      seen.add(c.userId);
      let view = this.views.get(c.userId);
      const isNew = !view;
      if (!view) {
        view = new CharacterView(this.scene, c.userId, (v) => this.press(v));
        this.views.set(c.userId, view);
      }
      const x = Math.round(zone.x + zone.width / 2);
      const feetY = Math.round(zone.y + zone.height - 3);
      // Desk zones are desk-over-chair: the leave sign stands at the front of the desk.
      const deskY = zone.height >= 64 ? Math.round(zone.y + 30) : feetY;
      view.update(c, x, feetY, deskY, this.options.sheetFor(c), isNew);
    }
    for (const [userId, view] of this.views) {
      if (seen.has(userId)) continue;
      this.views.delete(userId);
      this.fadeOut(view);
    }
  }

  refreshLabels(): void {
    for (const view of this.views.values()) view.refreshLabel();
  }

  private press(view: CharacterView): void {
    if (this.options.isGesture()) return;
    this.options.onClick?.(view.userId, view.screenPoint());
  }

  private fadeOut(view: CharacterView): void {
    this.leaving.add(view);
    view.disable();
    this.scene.tweens.add({
      targets: view.container,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.leaving.delete(view);
        view.destroy();
      },
    });
  }

  destroy(): void {
    for (const view of this.views.values()) view.destroy();
    for (const view of this.leaving) view.destroy();
    this.views.clear();
    this.leaving.clear();
  }
}
