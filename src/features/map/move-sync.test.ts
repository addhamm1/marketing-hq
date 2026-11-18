import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapTile } from "@/game";
import { MOVE_GAP_MS, MoveSync, type MoveOutcome } from "./move-sync";

const A = { x: 1, y: 1 };
const B = { x: 2, y: 2 };
const C = { x: 3, y: 3 };

function setup(outcomes: MoveOutcome[] = []) {
  const sent: MapTile[] = [];
  const sync = new MoveSync(async (tile) => {
    sent.push(tile);
    return outcomes.shift() ?? "sent";
  });
  return { sent, sync };
}

describe("MoveSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the first move straight away", async () => {
    const { sent, sync } = setup();
    sync.push(A);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual([A]);
  });

  it("never sends faster than the rate limit", async () => {
    const { sent, sync } = setup();
    sync.push(A);
    await vi.advanceTimersByTimeAsync(0);
    sync.push(B);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS - 1);
    expect(sent).toEqual([A]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sent).toEqual([A, B]);
  });

  it("keeps only the latest destination while waiting", async () => {
    const { sent, sync } = setup();
    sync.push(A);
    await vi.advanceTimersByTimeAsync(0);
    sync.push(B);
    sync.push(C);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS);
    expect(sent).toEqual([A, C]);
  });

  it("does not repeat a position the server already has", async () => {
    const { sent, sync } = setup();
    sync.push(A);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS * 2);
    sync.push(A);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS * 2);
    expect(sent).toEqual([A]);
  });

  it("tries again when the server says not yet", async () => {
    const { sent, sync } = setup(["limited"]);
    sync.push(A);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS);
    expect(sent).toEqual([A, A]);
  });

  it("prefers a newer destination over retrying an old one", async () => {
    const { sent, sync } = setup(["limited"]);
    sync.push(A);
    sync.push(B);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS);
    expect(sent).toEqual([A, B]);
  });

  it("does not retry a failure on its own, but the next push does", async () => {
    const { sent, sync } = setup(["failed"]);
    sync.push(A);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS * 3);
    expect(sent).toEqual([A]);
    sync.push(A);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual([A, A]);
  });

  it("survives a send that throws", async () => {
    const sent: MapTile[] = [];
    const sync = new MoveSync(async (tile) => {
      sent.push(tile);
      if (sent.length === 1) throw new Error("offline");
      return "sent";
    });
    sync.push(A);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS);
    sync.push(B);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS);
    expect(sent).toEqual([A, B]);
  });

  it("sends nothing after it is disposed", async () => {
    const { sent, sync } = setup();
    sync.push(A);
    await vi.advanceTimersByTimeAsync(0);
    sync.push(B);
    sync.dispose();
    sync.push(C);
    await vi.advanceTimersByTimeAsync(MOVE_GAP_MS * 2);
    expect(sent).toEqual([A]);
  });
});
