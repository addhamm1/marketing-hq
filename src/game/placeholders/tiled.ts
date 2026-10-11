import { TILE_MARGIN, TILE_SIZE, TILE_SPACING, type TileName, gid, tilesetDimensions } from "./tileset";

/** Minimal builder for Tiled 1.10 JSON maps (orthogonal, embedded tileset, finite). */

type TileLayerJson = {
  id: number;
  name: string;
  type: "tilelayer";
  x: 0;
  y: 0;
  width: number;
  height: number;
  data: number[];
  opacity: 1;
  visible: true;
};

type ZoneObjectJson = {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0;
  visible: true;
};

type ObjectLayerJson = {
  id: number;
  name: string;
  type: "objectgroup";
  draworder: "topdown";
  x: 0;
  y: 0;
  objects: ZoneObjectJson[];
  opacity: 1;
  visible: true;
};

export type LayerName = "floor" | "walls" | "furniture";

export class TiledMapBuilder {
  private readonly layers: Record<LayerName, number[]>;
  private readonly zones: ZoneObjectJson[] = [];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    const blank = () => new Array<number>(width * height).fill(0);
    this.layers = { floor: blank(), walls: blank(), furniture: blank() };
  }

  /** Place a tile at tile coordinates. Out-of-range coordinates are ignored. */
  put(layer: LayerName, x: number, y: number, tile: TileName | null): this {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this;
    this.layers[layer][y * this.width + x] = tile ? gid(tile) : 0;
    return this;
  }

  fill(layer: LayerName, x: number, y: number, w: number, h: number, tile: TileName | ((x: number, y: number) => TileName)): this {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.put(layer, xx, yy, typeof tile === "function" ? tile(xx, yy) : tile);
    }
    return this;
  }

  /** Add a zone rectangle given in tile units; stored in pixels as Tiled expects. */
  zone(name: string, x: number, y: number, w: number, h: number, type = "zone"): this {
    this.zones.push({
      id: this.zones.length + 1,
      name,
      type,
      x: x * TILE_SIZE,
      y: y * TILE_SIZE,
      width: w * TILE_SIZE,
      height: h * TILE_SIZE,
      rotation: 0,
      visible: true,
    });
    return this;
  }

  zoneNames(): string[] {
    return this.zones.map((z) => z.name);
  }

  toJSON() {
    const names: LayerName[] = ["floor", "walls", "furniture"];
    const tileLayers: TileLayerJson[] = names.map((name, i) => ({
      id: i + 1,
      name,
      type: "tilelayer",
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      data: this.layers[name],
      opacity: 1,
      visible: true,
    }));
    const zoneLayer: ObjectLayerJson = {
      id: names.length + 1,
      name: "zones",
      type: "objectgroup",
      draworder: "topdown",
      x: 0,
      y: 0,
      objects: this.zones,
      opacity: 1,
      visible: true,
    };
    const dims = tilesetDimensions();
    return {
      compressionlevel: -1,
      height: this.height,
      width: this.width,
      infinite: false,
      orientation: "orthogonal",
      renderorder: "right-down",
      tiledversion: "1.10.2",
      version: "1.10",
      type: "map",
      tilewidth: TILE_SIZE,
      tileheight: TILE_SIZE,
      nextlayerid: names.length + 2,
      nextobjectid: this.zones.length + 1,
      layers: [...tileLayers, zoneLayer],
      tilesets: [
        {
          firstgid: 1,
          name: "tiles",
          image: "tiles.png",
          imagewidth: dims.imagewidth,
          imageheight: dims.imageheight,
          columns: dims.columns,
          tilecount: dims.tilecount,
          tilewidth: TILE_SIZE,
          tileheight: TILE_SIZE,
          margin: TILE_MARGIN,
          spacing: TILE_SPACING,
        },
      ],
    };
  }
}
