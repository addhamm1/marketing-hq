import Phaser from "phaser";

import { TAP_MAX_MOVE } from "./tap";

const DRAG_THRESHOLD = TAP_MAX_MOVE; // px before a press becomes a pan, so a pan is never a tap
const MAX_ZOOM_FACTOR = 4; // relative to the fit zoom
const WHEEL_STEP = 1.0015;

/**
 * Fits the map to the canvas, then lets people pan (drag) and zoom (wheel or
 * pinch) within limits. `wasGesture()` tells click handlers to ignore the
 * pointer-up that ends a drag or a pinch.
 */
export class CameraController {
  private fitZoom = 1;
  private gesture = false;
  private dragging = false;
  private pinchDistance = 0;
  private pinchZoom = 1;
  private downX = 0;
  private downY = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapWidth: number,
    private readonly mapHeight: number,
  ) {
    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.fit, this);
    this.fit();
  }

  wasGesture(): boolean {
    return this.gesture;
  }

  /** Show the whole map, centred. */
  fit(): void {
    const cam = this.scene.cameras.main;
    const { width, height } = this.scene.scale;
    if (width < 1 || height < 1) return;
    cam.setSize(width, height);
    this.fitZoom = Math.min(width / this.mapWidth, height / this.mapHeight);
    cam.setZoom(this.fitZoom);
    cam.centerOn(this.mapWidth / 2, this.mapHeight / 2);
    this.clamp();
  }

  private zoomAt(screenX: number, screenY: number, zoom: number): void {
    const cam = this.scene.cameras.main;
    const next = Phaser.Math.Clamp(zoom, this.fitZoom, this.fitZoom * MAX_ZOOM_FACTOR);
    const halfW = cam.width / 2;
    const halfH = cam.height / 2;
    // Keep the world point under the pointer fixed (camera zooms around its centre).
    const worldX = cam.scrollX + halfW + (screenX - halfW) / cam.zoom;
    const worldY = cam.scrollY + halfH + (screenY - halfH) / cam.zoom;
    cam.setZoom(next);
    cam.scrollX = worldX - halfW - (screenX - halfW) / next;
    cam.scrollY = worldY - halfH - (screenY - halfH) / next;
    this.clamp();
  }

  /** Keep the map on screen; centre it on an axis where it is smaller than the view. */
  private clamp(): void {
    const cam = this.scene.cameras.main;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const axis = (scroll: number, half: number, view: number, size: number) => {
      if (view >= size) return size / 2 - half;
      const left = scroll + half - view / 2;
      return Phaser.Math.Clamp(left, 0, size - view) - half + view / 2;
    };
    cam.scrollX = axis(cam.scrollX, cam.width / 2, viewW, this.mapWidth);
    cam.scrollY = axis(cam.scrollY, cam.height / 2, viewH, this.mapHeight);
  }

  private pointers(): [Phaser.Input.Pointer, Phaser.Input.Pointer] | null {
    const { pointer1, pointer2 } = this.scene.input;
    return pointer1?.isDown && pointer2?.isDown ? [pointer1, pointer2] : null;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.pointers()) {
      this.gesture = false;
      this.dragging = false;
      this.downX = pointer.x;
      this.downY = pointer.y;
    }
    this.lastX = pointer.x;
    this.lastY = pointer.y;
    this.pinchDistance = 0;
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    const pair = this.pointers();
    if (pair) {
      const [a, b] = pair;
      const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      this.gesture = true;
      if (this.pinchDistance === 0) {
        this.pinchDistance = distance || 1;
        this.pinchZoom = this.scene.cameras.main.zoom;
        return;
      }
      this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (this.pinchZoom * distance) / this.pinchDistance);
      return;
    }
    if (!pointer.isDown) return;
    if (!this.dragging && Phaser.Math.Distance.Between(this.downX, this.downY, pointer.x, pointer.y) > DRAG_THRESHOLD) {
      this.dragging = true;
      this.gesture = true;
    }
    if (this.dragging) {
      const cam = this.scene.cameras.main;
      cam.scrollX -= (pointer.x - this.lastX) / cam.zoom;
      cam.scrollY -= (pointer.y - this.lastY) / cam.zoom;
      this.clamp();
    }
    this.lastX = pointer.x;
    this.lastY = pointer.y;
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    this.pinchDistance = 0;
    this.dragging = false;
    // After a pinch, continue panning smoothly from the remaining finger.
    const { pointer1, pointer2 } = this.scene.input;
    const remaining = [pointer1, pointer2].find((p) => p && p !== pointer && p.isDown);
    if (remaining) {
      this.lastX = remaining.x;
      this.lastY = remaining.y;
    }
  }

  private onWheel(pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number): void {
    const cam = this.scene.cameras.main;
    this.zoomAt(pointer.x, pointer.y, cam.zoom * Math.pow(WHEEL_STEP, -dy));
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    input.off(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.fit, this);
  }
}
