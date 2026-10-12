import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { type NavGrid, type Rect, faceToward, isWalkable, nearestTile, parseNavGrid } from "./grid";
import { SEAT_COST, findPath } from "./path";
import { buildPlaces, homeSpot } from "./places";

/** Build a grid from ASCII art: `#` blocked, `s` seat, anything else floor. */
function gridOf(rows: string[]): NavGrid {
  const height = rows.length;
  const width = rows[0].length;
  const walkable = new Uint8Array(width * height);
  const seat = new Uint8Array(width * height);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      walkable[y * width + x] = c === "#" ? 0 : 1;
      seat[y * width + x] = c === "s" ? 1 : 0;
    }),
  );
  return { width, height, tileSize: 32, walkable, seat };
}

function loadMap(name: string): { json: unknown; zones: Rect[] } {
  const json = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../public/maps", `${name}.json`), "utf8")) as {
    layers: { name: string; objects?: Rect[] }[];
  };
  return { json, zones: json.layers.find((l) => l.name === "zones")?.objects ?? [] };
}

function isContiguous(p: { x: number; y: number }[]): boolean {
  return p.every((t, i) => i === 0 || Math.abs(t.x - p[i - 1].x) + Math.abs(t.y - p[i - 1].y) === 1);
}

describe("findPath", () => {
  it("walks around walls with 4-direction steps", () => {
    const grid = gridOf(["....", ".##.", "...."]);
    const p = findPath(grid, { x: 0, y: 1 }, { x: 3, y: 1 });
    expect(p).not.toBeNull();
    expect(p?.[0]).toEqual({ x: 0, y: 1 });
    expect(p?.at(-1)).toEqual({ x: 3, y: 1 });
    expect(p?.length).toBe(6);
    expect(isContiguous(p ?? [])).toBe(true);
    expect(p?.every((t) => isWalkable(grid, t.x, t.y))).toBe(true);
  });

  it("returns null when the goal is blocked or walled off", () => {
    const grid = gridOf(["..#..", "..#..", "..#.."]);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeNull();
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 1 })).toBeNull();
  });

  it("returns the start alone when already there", () => {
    expect(findPath(gridOf(["..."]), { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 1, y: 0 }]);
  });

  it("detours around seats unless the seat is the goal", () => {
    const grid = gridOf([".s.", "...", "..."]);
    expect(SEAT_COST).toBeGreaterThan(3);
    const around = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(around?.some((t) => t.x === 1 && t.y === 0)).toBe(false);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  });
});

describe("grid helpers", () => {
  it("faces the blocked neighbour, or the viewer in the open", () => {
    const grid = gridOf(["###", "...", "..."]);
    expect(faceToward(grid, { x: 1, y: 1 })).toBe("up");
    expect(faceToward(grid, { x: 1, y: 2 })).toBe("down");
  });

  it("finds the nearest tile matching a predicate", () => {
    const grid = gridOf(["....", "....", "...."]);
    expect(nearestTile(grid, { x: 0, y: 0 }, (t) => t.x === 3 && t.y === 2)).toEqual({ x: 3, y: 2 });
    expect(nearestTile(grid, { x: 0, y: 0 }, () => false)).toBeNull();
  });
});

describe("generated maps", () => {
  it("parses tile properties: walls block, chairs and doors are walkable, chairs are seats", () => {
    const { json, zones } = loadMap("hq");
    const grid = parseNavGrid(json);
    expect(grid).not.toBeNull();
    if (!grid) return;
    expect(grid.width).toBe(32);
    expect(isWalkable(grid, 0, 0)).toBe(false); // outer wall
    expect(isWalkable(grid, 10, 10)).toBe(false); // desk
    expect(isWalkable(grid, 10, 11)).toBe(true); // its chair
    expect(grid.seat[11 * grid.width + 10]).toBe(1);
    expect(isWalkable(grid, 27, 8)).toBe(true); // studio door
    expect(zones.length).toBeGreaterThan(20);
  });

  it("can reach every desk, room and open tile from every desk on the HQ map", () => {
    const { json, zones } = loadMap("hq");
    const grid = parseNavGrid(json);
    if (!grid) throw new Error("hq.json did not parse");
    const places = buildPlaces(grid, zones);
    const homes = zones.filter((z) => /^desk-\d+$/.test(z.name)).map((z) => homeSpot(grid, z));
    expect(homes).toHaveLength(16);
    for (const kind of ["cafe", "meeting", "booth", "studio", "lounge"] as const) {
      expect(places.seats[kind].length + places.floor[kind].length, kind).toBeGreaterThan(0);
    }
    expect(places.seats.meeting.length).toBeGreaterThan(4);
    expect(places.seats.lounge.length).toBeGreaterThan(4);
    const start = homes[0];
    if (!start) throw new Error("no home");
    expect(start.face).toBe("up");
    const targets = [
      ...homes.flatMap((h) => (h ? [h] : [])),
      ...Object.values(places.seats).flat(),
      ...Object.values(places.floor).flat(),
    ];
    for (const t of targets) {
      const p = findPath(grid, start, t);
      expect(p, `${t.x},${t.y}`).not.toBeNull();
      expect(isContiguous(p ?? [])).toBe(true);
    }
  });

  it("can reach every spot on the field and home maps", () => {
    for (const name of ["field", "home"]) {
      const { json, zones } = loadMap(name);
      const grid = parseNavGrid(json);
      if (!grid) throw new Error(`${name}.json did not parse`);
      const spots = zones.map((z) => homeSpot(grid, z)).flatMap((s) => (s ? [s] : []));
      expect(spots).toHaveLength(8);
      for (const s of spots) expect(findPath(grid, spots[0], s), `${name} ${s.x},${s.y}`).not.toBeNull();
    }
  });

  it("rejects malformed map JSON", () => {
    expect(parseNavGrid({ width: "x" })).toBeNull();
    expect(parseNavGrid(null)).toBeNull();
  });
});
