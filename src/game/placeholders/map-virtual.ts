import { TiledMapBuilder } from "./tiled";

/** Outdoor "field" map (16x10): grass, crossing paths, trees, eight standing spots. */
export function buildFieldMap(): TiledMapBuilder {
  const m = new TiledMapBuilder(16, 10);
  m.fill("floor", 0, 0, 16, 10, (x, y) => ((x * 7 + y * 13) % 11 === 0 ? "grass-flowers" : "grass"));
  m.fill("floor", 0, 5, 16, 1, "path");
  m.fill("floor", 7, 0, 1, 10, "path");

  const trees: [number, number][] = [
    [0, 0], [2, 0], [5, 0], [10, 0], [13, 0], [15, 1], [0, 3], [15, 4], [0, 8], [14, 9], [9, 9], [5, 9],
  ];
  for (const [x, y] of trees) m.put("furniture", x, y, "tree");
  m.put("furniture", 9, 1, "rock").put("furniture", 1, 6, "rock");
  m.put("furniture", 9, 4, "bench").put("furniture", 5, 6, "bench");

  const spots: [number, number][] = [[2, 2], [4, 3], [10, 3], [12, 2], [3, 7], [5, 8], [10, 7], [12, 8]];
  spots.forEach(([x, y], i) => m.zone(`spot-${i + 1}`, x, y, 1, 1, "spot"));
  return m;
}

/** Cosy "home" interior (16x10) for work-from-home days, eight standing spots. */
export function buildHomeMap(): TiledMapBuilder {
  const m = new TiledMapBuilder(16, 10);
  m.fill("floor", 0, 0, 16, 10, "wood-floor");
  m.fill("floor", 8, 4, 5, 3, "rug-home");

  m.fill("walls", 0, 0, 16, 1, "wall-top");
  m.fill("walls", 0, 9, 16, 1, "wall-top");
  m.fill("walls", 0, 0, 1, 10, "wall-top");
  m.fill("walls", 15, 0, 1, 10, "wall-top");
  m.fill("walls", 1, 1, 14, 1, "wall");
  for (const x of [3, 9, 12]) m.put("walls", x, 1, "window");
  m.put("walls", 7, 9, "door");

  m.put("furniture", 2, 2, "bed").put("furniture", 2, 3, "bed-foot");
  m.put("furniture", 5, 2, "desk").put("furniture", 5, 3, "chair");
  m.put("furniture", 7, 2, "bookshelf");
  m.fill("furniture", 11, 2, 4, 1, "kitchen-counter");
  m.fill("furniture", 9, 7, 3, 1, "couch");
  m.put("furniture", 10, 5, "cafe-table");
  m.put("furniture", 1, 8, "plant").put("furniture", 14, 8, "plant").put("furniture", 1, 5, "plant");

  const spots: [number, number][] = [[5, 3], [3, 5], [6, 6], [9, 5], [11, 5], [13, 4], [3, 8], [12, 8]];
  spots.forEach(([x, y], i) => m.zone(`spot-${i + 1}`, x, y, 1, 1, "spot"));
  return m;
}
