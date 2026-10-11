/**
 * Generates placeholder pixel art so the map and the character editor work end
 * to end before real art arrives. Run with `pnpm make:placeholders`.
 *
 * Writes:
 *   public/maps/tiles.png                 32x32 tileset, 8 columns, 1px extruded gutters
 *   public/maps/{hq,field,home}.json      Tiled 1.10 maps with an embedded tileset
 *   public/sprites/<layer>/<option>.png   6x4 frame sheets (192x128)
 *   public/sprites/manifest.json          layer catalogue read by the compositor
 *
 * Replacing the art with a bought pack is a data change only: swap the PNGs,
 * edit the maps in Tiled, and update manifest.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

import { buildHqMap } from "../src/game/placeholders/map-hq";
import { buildFieldMap, buildHomeMap } from "../src/game/placeholders/map-virtual";
import type { PixelBuffer } from "../src/game/placeholders/pixels";
import { CATALOG, buildManifest, overlayFile } from "../src/game/placeholders/sprites/catalog";
import { buildSheet } from "../src/game/placeholders/sprites/sheet";
import type { TiledMapBuilder } from "../src/game/placeholders/tiled";
import { buildTileset } from "../src/game/placeholders/tileset";

const root = path.resolve(import.meta.dirname, "..", "public");

function writePng(file: string, buf: PixelBuffer): void {
  const png = new PNG({ width: buf.width, height: buf.height });
  png.data = Buffer.from(buf.data);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, PNG.sync.write(png));
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
}

function writeMap(name: string, map: TiledMapBuilder): void {
  writeJson(path.join(root, "maps", `${name}.json`), map.toJSON());
  console.log(`maps/${name}.json  ${map.width}x${map.height}  zones: ${map.zoneNames().join(", ")}`);
}

writePng(path.join(root, "maps", "tiles.png"), buildTileset());
console.log("maps/tiles.png");
writeMap("hq", buildHqMap());
writeMap("field", buildFieldMap());
writeMap("home", buildHomeMap());

let sheets = 0;
for (const layer of CATALOG) {
  for (const option of layer.options) {
    writePng(path.join(root, "sprites", layer.key, `${option.id}.png`), buildSheet(option.draw));
    sheets++;
    if (option.overlay) {
      writePng(path.join(root, "sprites", overlayFile(layer.key, option.id)), buildSheet(option.overlay));
      sheets++;
    }
  }
}
writeJson(path.join(root, "sprites", "manifest.json"), buildManifest());
console.log(`sprites: ${sheets} sheets + manifest.json`);
