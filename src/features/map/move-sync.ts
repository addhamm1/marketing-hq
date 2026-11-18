import type { MapTile } from "@/game";

/** `limited`: the server's rate limit said not yet. `failed`: give up until the next move. */
export type MoveOutcome = "sent" | "limited" | "failed";

/** A little above `map_move`'s 400 ms limit, so a normal walk is never refused. */
export const MOVE_GAP_MS = 500;

const same = (a: MapTile | null, b: MapTile | null) => a?.x === b?.x && a?.y === b?.y;

/**
 * Sends the viewer's position at a pace the server accepts. Only the latest
 * destination matters: taps made while waiting replace each other.
 */
export class MoveSync {
  private queued: MapTile | null = null;
  private lastSent: MapTile | null = null;
  private lastAt = -Infinity;
  private inFlight = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(
    private readonly send: (tile: MapTile) => Promise<MoveOutcome>,
    private readonly now: () => number = () => Date.now(),
    private readonly gapMs = MOVE_GAP_MS,
  ) {}

  push(tile: MapTile): void {
    if (this.disposed || (!this.queued && same(tile, this.lastSent))) return;
    this.queued = tile;
    this.pump();
  }

  dispose(): void {
    this.disposed = true;
    this.queued = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private pump(): void {
    if (this.disposed || this.inFlight || this.timer || !this.queued) return;
    const wait = this.lastAt + this.gapMs - this.now();
    if (wait > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.pump();
      }, wait);
      return;
    }
    const tile = this.queued;
    this.queued = null;
    this.inFlight = true;
    this.lastAt = this.now();
    void this.send(tile)
      .catch((): MoveOutcome => "failed")
      .then((outcome) => {
        this.inFlight = false;
        if (outcome === "sent") this.lastSent = tile;
        if (outcome === "limited" && !this.queued) this.queued = tile;
        this.pump();
      });
  }
}
