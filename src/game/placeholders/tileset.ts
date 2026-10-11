import { PixelBuffer } from "./pixels";
import * as F from "./tiles-features";
import * as U from "./tiles-furniture";
import * as S from "./tiles-structure";
import type { TileDraw } from "./tiles-structure";

export const TILE_SIZE = 32;
export const TILESET_COLUMNS = 8;
/** 1px extruded border around every tile prevents seams at fractional zoom. */
export const TILE_MARGIN = 1;
export const TILE_SPACING = 2;

/** Tile order in `tiles.png`. Index + 1 is the Tiled gid (embedded tileset has firstgid 1). */
const TILES = [
  ["floor-a", S.floorA],
  ["floor-b", S.floorB],
  ["carpet", S.carpet],
  ["rug", S.rug],
  ["wall", S.wall],
  ["wall-top", S.wallTop],
  ["window", S.windowTile],
  ["door", S.door],
  ["desk", U.desk],
  ["chair", U.chair],
  ["plant", U.plant],
  ["meeting-table", U.meetingTable],
  ["sofa", U.sofa],
  ["bookshelf", U.bookshelf],
  ["kanban", F.kanban],
  ["mailbox", F.mailbox],
  ["notice-board", F.noticeBoard],
  ["cafe-counter", F.cafeCounter],
  ["coffee-machine", F.coffeeMachine],
  ["trophy-shelf", F.trophyShelf],
  ["reception-desk", F.receptionDesk],
  ["studio-light", F.studioLight],
  ["studio-backdrop", F.studioBackdrop],
  ["grass", S.grass],
  ["path", S.path],
  ["tree", U.tree],
  ["wood-floor", S.woodFloor],
  ["bed", U.bedHead],
  ["couch", U.couch],
  ["glass-h", S.glassH],
  ["glass-v", S.glassV],
  ["grass-flowers", S.grassFlowers],
  ["studio-floor", S.studioFloor],
  ["cafe-table", U.cafeTable],
  ["rug-home", S.rugHome],
  ["bed-foot", U.bedFoot],
  ["kitchen-counter", U.kitchenCounter],
  ["bench", U.bench],
  ["rock", U.rock],
] as const satisfies readonly (readonly [string, TileDraw])[];

export type TileName = (typeof TILES)[number][0];

export const TILE_NAMES: readonly TileName[] = TILES.map(([name]) => name);

export function gid(name: TileName): number {
  return TILE_NAMES.indexOf(name) + 1;
}

export function tilesetDimensions() {
  const rows = Math.ceil(TILES.length / TILESET_COLUMNS);
  const cell = TILE_SIZE + TILE_SPACING;
  return {
    columns: TILESET_COLUMNS,
    tilecount: rows * TILESET_COLUMNS,
    imagewidth: TILE_MARGIN * 2 + TILESET_COLUMNS * cell - TILE_SPACING,
    imageheight: TILE_MARGIN * 2 + rows * cell - TILE_SPACING,
  };
}

/** Paint every tile, then extrude each tile's edge pixels by 1px into the gutter. */
export function buildTileset(): PixelBuffer {
  const dims = tilesetDimensions();
  const out = new PixelBuffer(dims.imagewidth, dims.imageheight);
  const cell = TILE_SIZE + TILE_SPACING;
  TILES.forEach(([, draw], i) => {
    const tile = new PixelBuffer(TILE_SIZE, TILE_SIZE);
    draw(tile, 0, 0);
    const ox = TILE_MARGIN + (i % TILESET_COLUMNS) * cell;
    const oy = TILE_MARGIN + Math.floor(i / TILESET_COLUMNS) * cell;
    for (let y = -1; y <= TILE_SIZE; y++) {
      for (let x = -1; x <= TILE_SIZE; x++) {
        const sx = Math.min(TILE_SIZE - 1, Math.max(0, x));
        const sy = Math.min(TILE_SIZE - 1, Math.max(0, y));
        out.set(ox + x, oy + y, tile.get(sx, sy));
      }
    }
  });
  return out;
}
