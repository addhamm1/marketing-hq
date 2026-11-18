import type Phaser from "phaser";

import { resolveFloorTap } from "./life/control";
import type { Director } from "./life/director";
import { type NavGrid, type Tile, feetOf, isWalkable } from "./life/grid";
import type { PixelGameOptions } from "./types";

const MARKER_DEPTH = 6; // on the floor, under signs and characters
const MARKER_COLOR = 0xf7d139;

type Options = Pick<PixelGameOptions, "onFloorTap" | "onPlayerMove">;

/** The viewer's own character: walks where the floor is tapped, with a small marker at the destination. */
export class PlayerControl {
  private readonly marker: Phaser.GameObjects.Graphics;
  private playerId: string | null = null;
  private destination: Tile | null = null;
  private motion = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: NavGrid,
    private readonly director: Director,
    private readonly options: Options,
  ) {
    this.marker = scene.add
      .graphics()
      .fillStyle(MARKER_COLOR, 0.28)
      .fillCircle(0, 0, 9)
      .lineStyle(1.5, MARKER_COLOR, 0.95)
      .strokeCircle(0, 0, 9)
      .fillStyle(MARKER_COLOR, 1)
      .fillCircle(0, 0, 2)
      .setDepth(MARKER_DEPTH)
      .setVisible(false);
  }

  setPlayer(userId: string | null): void {
    if (userId === this.playerId) return;
    this.playerId = userId;
    this.finish();
  }

  setMotion(on: boolean): void {
    this.motion = on;
  }

  /** A tap on open floor, in world pixels. */
  tap(worldX: number, worldY: number): void {
    const tile = { x: Math.floor(worldX / this.grid.tileSize), y: Math.floor(worldY / this.grid.tileSize) };
    if (!this.playerId) {
      if (isWalkable(this.grid, tile.x, tile.y)) this.options.onFloorTap?.();
      return;
    }
    const destination = resolveFloorTap(this.grid, tile);
    if (!destination || !this.director.command(this.playerId, destination)) return;
    this.destination = destination;
    this.showMarker(destination);
    this.options.onPlayerMove?.(destination, false);
  }

  tick(): void {
    if (!this.destination || !this.playerId || !this.director.arrived(this.playerId)) return;
    this.options.onPlayerMove?.(this.destination, true);
    this.finish();
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.marker);
    this.marker.destroy();
  }

  private showMarker(tile: Tile): void {
    const feet = feetOf(this.grid, tile);
    this.scene.tweens.killTweensOf(this.marker);
    this.marker.setPosition(feet.x, feet.y - 4).setScale(1).setAlpha(1).setVisible(true);
    if (this.motion) {
      this.scene.tweens.add({ targets: this.marker, scale: 0.7, alpha: 0.6, duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private finish(): void {
    this.destination = null;
    this.scene.tweens.killTweensOf(this.marker);
    this.marker.setVisible(false);
  }
}
