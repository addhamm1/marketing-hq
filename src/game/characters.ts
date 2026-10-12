import type Phaser from "phaser";

import { CharacterView, type SheetInfo } from "./character-view";
import { type AgentInput, Director } from "./life/director";
import type { NavGrid, Rect } from "./life/grid";
import { buildPlaces, homeSpot } from "./life/places";
import type { MapCharacter } from "./types";

type Options = {
  sheetFor: (character: MapCharacter) => SheetInfo;
  isGesture: () => boolean;
  onClick?: (userId: string, screen: { x: number; y: number }) => void;
};

/**
 * Keeps one CharacterView per user in sync with the latest list (add, update,
 * remove) and, when the map has a walk grid, lets the Director move them.
 */
export class CharacterManager {
  private readonly views = new Map<string, CharacterView>();
  /** Views drawn by the Director every frame (everyone checked in, not leave signs). */
  private readonly living = new Set<string>();
  private readonly leaving = new Set<CharacterView>();
  private readonly director: Director | null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly zones: Map<string, Rect>,
    private readonly grid: NavGrid | null,
    private readonly options: Options,
  ) {
    this.director = grid ? new Director(grid, buildPlaces(grid, [...zones.values()])) : null;
  }

  set(characters: MapCharacter[]): void {
    const seen = new Set<string>();
    const agents: AgentInput[] = [];
    this.living.clear();
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
      view.update(c, this.options.sheetFor(c), isNew);
      const home = this.grid && !c.onLeave ? homeSpot(this.grid, zone) : null;
      if (home && this.director) {
        agents.push({ id: c.userId, status: c.status, home });
        this.living.add(c.userId);
        if (isNew) view.fadeIn();
        continue;
      }
      // Desk zones are desk-over-chair: the leave sign stands at the front of the desk.
      const x = Math.round(zone.x + zone.width / 2);
      const feetY = Math.round(zone.y + zone.height - 3);
      view.place(x, c.onLeave && zone.height >= 64 ? Math.round(zone.y + 30) : feetY, isNew);
    }
    this.director?.sync(agents);
    for (const [userId, view] of this.views) {
      if (seen.has(userId)) continue;
      this.views.delete(userId);
      this.fadeOut(view);
    }
    this.tick(0, this.scene.time.now);
  }

  /** Advance the simulation and draw every moving character. Called from the scene's update. */
  tick(delta: number, time: number): void {
    if (!this.director) return;
    this.director.tick(delta);
    for (const id of this.living) {
      const pose = this.director.pose(id);
      if (pose) this.views.get(id)?.render(pose, time);
    }
  }

  setMotion(on: boolean): void {
    this.director?.setMotion(on);
    this.tick(0, this.scene.time.now);
  }

  /** Hold one character still while its popover is open. */
  setFocus(userId: string | null): void {
    this.director?.setPaused(userId);
  }

  refreshLabels(resolution?: number): void {
    for (const view of this.views.values()) view.refreshLabel(resolution);
  }

  private press(view: CharacterView): void {
    if (this.options.isGesture()) return;
    // Stop right away so the popover points at the character; the page releases it on close.
    this.director?.setPaused(view.userId);
    this.tick(0, this.scene.time.now);
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
    this.living.clear();
  }
}
