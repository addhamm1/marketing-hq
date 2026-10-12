import { type NavGrid, type Tile, inBounds, isWalkable } from "./grid";

/**
 * 4-direction A* on the walkability grid. Walking over a seat (a chair or a
 * sofa) costs more, so characters walk around other people's chairs unless
 * the seat is where they are going. Maps are a few hundred tiles, so this
 * runs in well under a millisecond.
 */

export const SEAT_COST = 6;
const STEPS: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Minimal binary min-heap of node indices keyed by a score array. */
class Heap {
  private readonly items: number[] = [];
  constructor(private readonly score: Float64Array) {}

  get size(): number {
    return this.items.length;
  }

  push(node: number): void {
    const a = this.items;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.score[a[parent]] <= this.score[a[i]]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop(): number {
    const a = this.items;
    const top = a[0];
    const last = a.pop() as number;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.score[a[l]] < this.score[a[m]]) m = l;
        if (r < a.length && this.score[a[r]] < this.score[a[m]]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Shortest path from `from` to `to`, both included, or null when `to` is not
 * reachable. The start tile may be blocked (someone standing on a spot that
 * a map edit has since covered); the goal must be walkable.
 */
export function findPath(grid: NavGrid, from: Tile, to: Tile): Tile[] | null {
  if (!inBounds(grid, from.x, from.y) || !isWalkable(grid, to.x, to.y)) return null;
  const w = grid.width;
  const start = from.y * w + from.x;
  const goal = to.y * w + to.x;
  if (start === goal) return [{ ...from }];

  const size = w * grid.height;
  const g = new Float64Array(size).fill(Infinity);
  const f = new Float64Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open = new Heap(f);
  const h = (i: number) => Math.abs((i % w) - to.x) + Math.abs(Math.floor(i / w) - to.y);

  g[start] = 0;
  f[start] = h(start);
  open.push(start);
  while (open.size) {
    const cur = open.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w;
    const cy = Math.floor(cur / w);
    for (const [dx, dy] of STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(grid, nx, ny)) continue;
      const n = ny * w + nx;
      if (closed[n]) continue;
      const cost = grid.seat[n] && n !== goal ? SEAT_COST : 1;
      const tentative = g[cur] + cost;
      if (tentative >= g[n]) continue;
      g[n] = tentative;
      f[n] = tentative + h(n);
      came[n] = cur;
      open.push(n);
    }
  }
  if (came[goal] === -1) return null;

  const path: Tile[] = [];
  for (let i = goal; i !== -1; i = came[i]) path.push({ x: i % w, y: Math.floor(i / w) });
  return path.reverse();
}
