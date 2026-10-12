import { type Facing, type NavGrid, type Rect, type Tile, faceToward, isSeat, isWalkable } from "./grid";

/**
 * Where characters can go, derived from the map's zone rectangles. A zone
 * name maps to a kind of place; inside it, seats (chairs, sofas) and floor
 * tiles are listed separately. Everything walkable outside any zone is
 * "open" floor for wandering and chatting.
 */

export type PlaceKind = "cafe" | "meeting" | "booth" | "studio" | "lounge";
export type Spot = Tile & { face: Facing };
export type Places = {
  seats: Record<PlaceKind, Spot[]>;
  floor: Record<PlaceKind, Spot[]>;
  open: Spot[];
};

/** Zone names (Tiled object names) per kind of place. Extra aliases make real art packs easy to map. */
export const ZONE_PLACES: Record<string, PlaceKind> = {
  cafe: "cafe",
  kitchen: "cafe",
  "meeting-room": "meeting",
  "phone-booth": "booth",
  studio: "studio",
  lounge: "lounge",
};

const DESK_OR_SPOT = /^(desk|spot)-\d+$/;
const KINDS: PlaceKind[] = ["cafe", "meeting", "booth", "studio", "lounge"];

function empty(): Record<PlaceKind, Spot[]> {
  return { cafe: [], meeting: [], booth: [], studio: [], lounge: [] };
}

function tilesOf(grid: NavGrid, rect: Rect): Tile[] {
  const ts = grid.tileSize;
  const out: Tile[] = [];
  for (let y = Math.floor(rect.y / ts); y < Math.ceil((rect.y + rect.height) / ts); y++) {
    for (let x = Math.floor(rect.x / ts); x < Math.ceil((rect.x + rect.width) / ts); x++) out.push({ x, y });
  }
  return out;
}

export function buildPlaces(grid: NavGrid, zones: Rect[]): Places {
  const seats = empty();
  const floor = empty();
  const claimed = new Set<number>();
  for (const zone of zones) {
    const kind = ZONE_PLACES[zone.name];
    const isDesk = DESK_OR_SPOT.test(zone.name);
    if (!kind && !isDesk) continue;
    for (const t of tilesOf(grid, zone)) {
      claimed.add(t.y * grid.width + t.x);
      if (!kind || !isWalkable(grid, t.x, t.y)) continue;
      const spot = { ...t, face: faceToward(grid, t) };
      (isSeat(grid, t.x, t.y) ? seats : floor)[kind].push(spot);
    }
  }
  const open: Spot[] = [];
  for (let y = 1; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      if (claimed.has(y * grid.width + x) || !isWalkable(grid, x, y) || isSeat(grid, x, y)) continue;
      open.push({ x, y, face: "down" });
    }
  }
  return { seats, floor, open };
}

/** True when the map has somewhere to go for `kind`. */
export function hasPlace(places: Places, kind: PlaceKind): boolean {
  return places.seats[kind].length + places.floor[kind].length > 0;
}

export function placeKinds(): readonly PlaceKind[] {
  return KINDS;
}

/**
 * The tile a character calls home inside its desk or spot zone: the bottom
 * row (the chair under a 1x2 desk zone), facing the desk when there is one.
 */
export function homeSpot(grid: NavGrid, zone: Rect): Spot | null {
  const ts = grid.tileSize;
  const tile = { x: Math.floor((zone.x + zone.width / 2) / ts), y: Math.floor((zone.y + zone.height - 1) / ts) };
  if (tile.x < 0 || tile.y < 0 || tile.x >= grid.width || tile.y >= grid.height) return null;
  const above = !isWalkable(grid, tile.x, tile.y - 1) && zone.height > ts;
  return { ...tile, face: above ? "up" : "down" };
}
