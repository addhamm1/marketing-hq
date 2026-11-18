/**
 * Tells a tap from a drag, a pinch or a long press. Pure: fed pointer events
 * by the map, tested on its own. A press stops being a tap for good the
 * moment it travels too far or a second finger touches the screen.
 */

/** CSS px a finger may wander. The camera starts panning at exactly this distance. */
export const TAP_MAX_MOVE = 6;
/** Held longer than this, a press is hesitation rather than a tap. */
export const TAP_MAX_MS = 600;

type Press = { id: number; x: number; y: number; at: number };

export class TapTracker {
  private readonly down_ = new Set<number>();
  private press: Press | null = null;
  private spoiled = false;

  down(id: number, x: number, y: number, at: number): void {
    if (this.down_.size > 0) {
      this.spoiled = true;
    } else {
      this.press = { id, x, y, at };
      this.spoiled = false;
    }
    this.down_.add(id);
  }

  move(id: number, x: number, y: number): void {
    if (this.press?.id === id && this.travelled(x, y) > TAP_MAX_MOVE) this.spoiled = true;
  }

  /** Returns true when this release completes a tap. */
  up(id: number, x: number, y: number, at: number): boolean {
    this.down_.delete(id);
    const press = this.press;
    if (press?.id !== id) return false;
    this.press = null;
    return !this.spoiled && this.travelled(x, y, press) <= TAP_MAX_MOVE && at - press.at <= TAP_MAX_MS;
  }

  private travelled(x: number, y: number, press = this.press): number {
    return press ? Math.hypot(x - press.x, y - press.y) : 0;
  }
}
