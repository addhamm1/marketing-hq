import Phaser from "phaser";

import { TapTracker } from "./tap";

/**
 * Reports taps on open floor. A tap that lands on a zone or a character
 * belongs to that object, and the end of a pan or pinch is not a tap at all.
 */
export class FloorTaps {
  private readonly tracker = new TapTracker();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isGesture: () => boolean,
    /** Signs carry no click of their own, but a tap on one is not a tap on the floor. */
    private readonly isCovered: (worldX: number, worldY: number) => boolean,
    private readonly onTap: (worldX: number, worldY: number) => void,
  ) {
    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUpOutside, this);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    this.tracker.down(pointer.id, pointer.x, pointer.y, this.scene.time.now);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.isDown) this.tracker.move(pointer.id, pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    const tapped = this.tracker.up(pointer.id, pointer.x, pointer.y, this.scene.time.now);
    if (!tapped || over.length > 0 || this.isGesture()) return;
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (!this.isCovered(world.x, world.y)) this.onTap(world.x, world.y);
  }

  private onUpOutside(pointer: Phaser.Input.Pointer): void {
    this.tracker.up(pointer.id, pointer.x, pointer.y, this.scene.time.now);
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUpOutside, this);
  }
}
