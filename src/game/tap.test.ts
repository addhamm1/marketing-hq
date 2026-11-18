import { describe, expect, it } from "vitest";
import { TAP_MAX_MOVE, TAP_MAX_MS, TapTracker } from "./tap";

describe("TapTracker", () => {
  it("counts a quick press and release as a tap", () => {
    const t = new TapTracker();
    t.down(1, 100, 100, 0);
    expect(t.up(1, 100, 100, 120)).toBe(true);
  });

  it("forgives a finger that wobbles within the limit", () => {
    const t = new TapTracker();
    t.down(1, 100, 100, 0);
    t.move(1, 100 + TAP_MAX_MOVE, 100);
    expect(t.up(1, 100 + TAP_MAX_MOVE, 100, 120)).toBe(true);
  });

  it("never counts a drag, even one that returns to where it started", () => {
    const t = new TapTracker();
    t.down(1, 100, 100, 0);
    t.move(1, 100 + TAP_MAX_MOVE + 1, 100);
    t.move(1, 100, 100);
    expect(t.up(1, 100, 100, 120)).toBe(false);
  });

  it("never counts a release far from the press", () => {
    const t = new TapTracker();
    t.down(1, 100, 100, 0);
    expect(t.up(1, 140, 100, 120)).toBe(false);
  });

  it("never counts a pinch, whichever finger lifts first", () => {
    const first = new TapTracker();
    first.down(1, 100, 100, 0);
    first.down(2, 200, 200, 20);
    expect(first.up(1, 100, 100, 80)).toBe(false);
    expect(first.up(2, 200, 200, 90)).toBe(false);

    const second = new TapTracker();
    second.down(1, 100, 100, 0);
    second.down(2, 200, 200, 20);
    expect(second.up(2, 200, 200, 80)).toBe(false);
    expect(second.up(1, 100, 100, 90)).toBe(false);
  });

  it("does not count the finger left behind after a pinch", () => {
    const t = new TapTracker();
    t.down(1, 100, 100, 0);
    t.down(2, 200, 200, 20);
    t.up(1, 100, 100, 80);
    t.down(1, 100, 100, 100);
    expect(t.up(1, 100, 100, 150)).toBe(false);
    expect(t.up(2, 200, 200, 160)).toBe(false);
  });

  it("recovers for the next tap once every finger is up", () => {
    const t = new TapTracker();
    t.down(1, 100, 100, 0);
    t.down(2, 200, 200, 20);
    t.up(1, 100, 100, 80);
    t.up(2, 200, 200, 90);
    t.down(1, 50, 50, 500);
    expect(t.up(1, 50, 50, 600)).toBe(true);
  });

  it("does not count a long press", () => {
    const t = new TapTracker();
    t.down(1, 100, 100, 0);
    expect(t.up(1, 100, 100, TAP_MAX_MS + 1)).toBe(false);
  });
});
