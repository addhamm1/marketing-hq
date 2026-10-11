import hq from "../../public/maps/hq.json";

type TiledMap = { layers: { name: string; type: string; objects?: { name: string }[] }[] };

const MAPS: Record<string, TiledMap> = { hq: hq as TiledMap };

/** Desk zone names (desk-1, desk-2, ...) of a branch map; unknown maps fall back to hq. */
export function deskZones(mapKey: string): string[] {
  const map = MAPS[mapKey] ?? MAPS.hq;
  const zones = map.layers.find((l) => l.name === "zones")?.objects ?? [];
  return zones
    .map((o) => o.name)
    .filter((n) => /^desk-\d+$/.test(n))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
}
