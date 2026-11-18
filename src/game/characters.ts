import type Phaser from "phaser";

import { CharacterView, type SheetInfo } from "./character-view";
import { InteractionPlayer } from "./interactions";
import { type AgentInput, Director } from "./life/director";
import type { NavGrid, Rect } from "./life/grid";
import { buildPlaces, homeSpot } from "./life/places";
import { PlayerControl } from "./player";
import type { MapCharacter, MapInteraction, MapPosition, MapTile, PixelGameOptions } from "./types";

type Options = {
  sheetFor: (character: MapCharacter) => SheetInfo;
  isGesture: () => boolean;
  onClick?: (userId: string, screen: { x: number; y: number }) => void;
} & Pick<PixelGameOptions, "onFloorTap" | "onPlayerMove">;

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
  private readonly interactions: InteractionPlayer | null;
  private readonly player: PlayerControl | null;
  /** Saved positions waiting for their character to appear. */
  private saved = new Map<string, MapTile>();
  private readonly restored = new Set<string>();
  private motion = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly zones: Map<string, Rect>,
    private readonly grid: NavGrid | null,
    private readonly options: Options,
  ) {
    this.director = grid ? new Director(grid, buildPlaces(grid, [...zones.values()])) : null;
    this.interactions = this.director ? new InteractionPlayer(scene, this.director, (id) => this.headOf(id)) : null;
    this.player = grid && this.director ? new PlayerControl(scene, grid, this.director, options) : null;
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
        view.calm = !this.motion;
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
      this.restored.delete(userId);
      this.fadeOut(view);
    }
    this.restorePositions();
    this.tick(0, this.scene.time.now);
  }

  /** Saved positions for this floor; a character already on the map keeps walking where it is. */
  setPositions(positions: MapPosition[]): void {
    this.saved = new Map(positions.map((p) => [p.userId, { x: p.x, y: p.y }]));
    this.restorePositions();
  }

  setPlayer(userId: string | null): void {
    this.player?.setPlayer(userId);
  }

  /** A tap on open floor, in world pixels. */
  tapFloor(worldX: number, worldY: number): void {
    this.player?.tap(worldX, worldY);
  }

  moveCharacter(userId: string, tile: MapTile): void {
    if (!this.living.has(userId)) {
      this.saved.set(userId, tile); // not here yet: they appear on that tile
      return;
    }
    this.restored.add(userId);
    this.director?.command(userId, tile);
  }

  playInteraction(interaction: MapInteraction): void {
    this.interactions?.play(interaction, this.scene.time.now);
  }

  celebrate(userId: string): void {
    this.interactions?.celebrate(userId, this.scene.time.now);
  }

  /** Advance the simulation and draw every moving character. Called from the scene's update. */
  tick(delta: number, time: number): void {
    if (!this.director) return;
    this.director.tick(delta);
    this.player?.tick();
    this.interactions?.tick(time);
    for (const id of this.living) {
      const pose = this.director.pose(id);
      if (!pose) continue;
      const shift = this.interactions?.dress(id, pose, time);
      this.views.get(id)?.render(pose, time, shift);
    }
  }

  setMotion(on: boolean): void {
    this.motion = on;
    this.director?.setMotion(on);
    this.interactions?.setMotion(on);
    this.player?.setMotion(on);
    for (const view of this.views.values()) view.calm = !on;
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

  private restorePositions(): void {
    for (const [userId, tile] of this.saved) {
      if (!this.living.has(userId) || this.restored.has(userId)) continue;
      this.restored.add(userId);
      this.director?.place(userId, tile);
    }
  }

  private headOf(userId: string): { x: number; y: number } | null {
    return this.living.has(userId) ? (this.views.get(userId)?.headPoint() ?? null) : null;
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
    this.interactions?.destroy();
    this.player?.destroy();
    for (const view of this.views.values()) view.destroy();
    for (const view of this.leaving) view.destroy();
    this.views.clear();
    this.leaving.clear();
    this.living.clear();
    this.restored.clear();
    this.saved.clear();
  }
}
