import { z } from "zod";

/**
 * Walkability grid read straight from a Tiled JSON map. Any tile on the
 * `walls` or `furniture` layer blocks, unless its tileset entry has the custom
 * property `walkable: true` (doors, chairs, sofas). `seat: true` marks tiles
 * characters sit on. Pure data: no Phaser, safe in Node tests.
 */

export type Tile = { x: number; y: number };
export type Facing = "down" | "left" | "right" | "up";
/** Pixel rectangle, as Tiled stores zone objects. */
export type Rect = { name: string; x: number; y: number; width: number; height: number };

export type NavGrid = {
  width: number;
  height: number;
  tileSize: number;
  walkable: Uint8Array;
  seat: Uint8Array;
};

const BLOCKING_LAYERS = new Set(["walls", "furniture"]);
const GID_MASK = 0x1fffffff; // strips Tiled's flip flags

const property = z.object({ name: z.string(), value: z.unknown() });
const mapSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tilewidth: z.number().int().positive(),
  layers: z.array(z.object({ name: z.string(), data: z.array(z.number()).optional() })),
  tilesets: z.array(
    z.object({
      firstgid: z.number().int(),
      tiles: z.array(z.object({ id: z.number().int(), properties: z.array(property).optional() })).optional(),
    }),
  ),
});

export function parseNavGrid(json: unknown): NavGrid | null {
  const parsed = mapSchema.safeParse(json);
  if (!parsed.success) return null;
  const { width, height, tilewidth, layers, tilesets } = parsed.data;
  const walkGids = new Set<number>();
  const seatGids = new Set<number>();
  for (const ts of tilesets) {
    for (const tile of ts.tiles ?? []) {
      const props = new Map((tile.properties ?? []).map((p) => [p.name, p.value]));
      if (props.get("walkable") === true) walkGids.add(ts.firstgid + tile.id);
      if (props.get("seat") === true) seatGids.add(ts.firstgid + tile.id);
    }
  }
  const size = width * height;
  const walkable = new Uint8Array(size).fill(1);
  const seat = new Uint8Array(size);
  for (const layer of layers) {
    if (!BLOCKING_LAYERS.has(layer.name) || layer.data?.length !== size) continue;
    layer.data.forEach((raw, i) => {
      const gid = raw & GID_MASK;
      if (!gid) return;
      if (seatGids.has(gid)) seat[i] = 1;
      if (!walkGids.has(gid)) walkable[i] = 0;
    });
  }
  for (let i = 0; i < size; i++) if (!walkable[i]) seat[i] = 0;
  return { width, height, tileSize: tilewidth, walkable, seat };
}

export function inBounds(grid: NavGrid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
}

export function isWalkable(grid: NavGrid, x: number, y: number): boolean {
  return inBounds(grid, x, y) && grid.walkable[y * grid.width + x] === 1;
}

export function isSeat(grid: NavGrid, x: number, y: number): boolean {
  return inBounds(grid, x, y) && grid.seat[y * grid.width + x] === 1;
}

export function tileKey(t: Tile): string {
  return `${t.x},${t.y}`;
}

/** Where a character's feet go when standing on `tile` (3px above the bottom edge). */
export function feetOf(grid: NavGrid, tile: Tile): { x: number; y: number } {
  return { x: tile.x * grid.tileSize + grid.tileSize / 2, y: (tile.y + 1) * grid.tileSize - 3 };
}

const NEIGHBOURS: readonly [Facing, number, number][] = [
  ["up", 0, -1],
  ["down", 0, 1],
  ["left", -1, 0],
  ["right", 1, 0],
];

/** Face the first blocked neighbour (a desk, a counter, a table), or the viewer when in the open. */
export function faceToward(grid: NavGrid, tile: Tile): Facing {
  for (const [face, dx, dy] of NEIGHBOURS) {
    if (inBounds(grid, tile.x + dx, tile.y + dy) && !isWalkable(grid, tile.x + dx, tile.y + dy)) return face;
  }
  return "down";
}

/** Breadth-first search for the closest walkable tile that `accept` likes (the tile itself included). */
export function nearestTile(grid: NavGrid, from: Tile, accept: (t: Tile) => boolean, limit = 400): Tile | null {
  if (!inBounds(grid, from.x, from.y)) return null;
  const seen = new Set<number>([from.y * grid.width + from.x]);
  const queue: Tile[] = [from];
  for (let head = 0; head < queue.length && head < limit; head++) {
    const t = queue[head];
    if (isWalkable(grid, t.x, t.y) && accept(t)) return t;
    for (const [, dx, dy] of NEIGHBOURS) {
      const nx = t.x + dx;
      const ny = t.y + dy;
      const i = ny * grid.width + nx;
      if (!inBounds(grid, nx, ny) || seen.has(i)) continue;
      seen.add(i);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}
