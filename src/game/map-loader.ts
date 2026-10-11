import Phaser from "phaser";

/**
 * Loads Tiled JSON maps and every embedded tileset image they reference, so a
 * new art pack (more tilesets, different file names) is a data change only.
 * External `.tsx` tilesets are not supported: embed tilesets when exporting.
 */

const MAPS_BASE = "/maps/";
export const TILE_LAYERS = ["floor", "walls", "furniture"] as const;

export function mapCacheKey(mapKey: string): string {
  return `map:${mapKey}`;
}

function tilesetTextureKey(image: string): string {
  return `tileset:${image}`;
}

type TilesetRef = { name: string; image: string };

function tilesetRefs(data: unknown): TilesetRef[] {
  if (typeof data !== "object" || data === null || !("tilesets" in data) || !Array.isArray(data.tilesets)) return [];
  const refs: TilesetRef[] = [];
  for (const ts of data.tilesets as unknown[]) {
    if (typeof ts !== "object" || ts === null) continue;
    const { name, image } = ts as { name?: unknown; image?: unknown };
    if (typeof name === "string" && typeof image === "string") refs.push({ name, image });
  }
  return refs;
}

function queueTilesetImages(scene: Phaser.Scene, data: unknown): void {
  for (const { image } of tilesetRefs(data)) {
    const key = tilesetTextureKey(image);
    if (!scene.textures.exists(key)) scene.load.image(key, MAPS_BASE + image);
  }
}

/** Call from `preload`: queues the map JSON (if not cached) and its tileset images. */
export function queueMap(scene: Phaser.Scene, mapKey: string): void {
  const key = mapCacheKey(mapKey);
  const cached: unknown = scene.cache.tilemap.get(key);
  if (cached) {
    queueTilesetImages(scene, (cached as { data?: unknown }).data);
    return;
  }
  scene.load.once(`filecomplete-tilemapJSON-${key}`, (_key: string, _type: string, data: unknown) => queueTilesetImages(scene, data));
  scene.load.tilemapTiledJSON(key, `${MAPS_BASE}${encodeURIComponent(mapKey)}.json`);
}

/** Call from `create`: builds the tilemap and its tile layers, or returns null if the map failed to load. */
export function buildMap(scene: Phaser.Scene, mapKey: string): Phaser.Tilemaps.Tilemap | null {
  const key = mapCacheKey(mapKey);
  const cached: unknown = scene.cache.tilemap.get(key);
  if (!cached) return null;
  const map = scene.make.tilemap({ key });
  const refs = tilesetRefs((cached as { data?: unknown }).data);
  const tilesets = refs
    .map(({ name, image }) => (scene.textures.exists(tilesetTextureKey(image)) ? map.addTilesetImage(name, tilesetTextureKey(image)) : null))
    .filter((t): t is Phaser.Tilemaps.Tileset => t !== null);
  TILE_LAYERS.forEach((name, depth) => {
    if (map.getLayerIndex(name) === null) return;
    map.createLayer(name, tilesets, 0, 0)?.setDepth(depth);
  });
  return map;
}
