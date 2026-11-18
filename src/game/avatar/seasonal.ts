import type { AvatarConfig, ManifestLayer, RegularItems, SeasonalLayer, SpriteManifest } from "./types";

/**
 * Seasonal outfit rules. Pure code: the server action, the creator, the map and
 * portraits all share it. A saved seasonal choice is never deleted: out of season
 * it is simply not worn, and it comes back when an event lists it again.
 */

/** Every seasonal catalogue id and the layer it belongs to. */
export const SEASONAL_ITEMS: Readonly<Record<string, SeasonalLayer>> = {
  "winter-sweater": "top",
  "winter-scarf": "accessory",
  "party-hat": "headwear",
  "ramadan-galabeya": "top",
  "ramadan-lantern": "accessory",
  "ramadan-taqiyah": "headwear",
  "eid-kaftan": "top",
  "eid-tarboush": "headwear",
  "eid-balloon": "accessory",
  "spring-shirt": "top",
  "spring-hat": "headwear",
  "egypt-scarf": "accessory",
  "egypt-cap": "headwear",
};

export const SEASONAL_LAYERS: readonly SeasonalLayer[] = ["top", "headwear", "accessory"];

export type SeasonalEvent = {
  key: string;
  name_en: string;
  name_ar: string;
  starts_on: string;
  ends_on: string;
  items: string[];
  is_active: boolean;
};

export const isSeasonalItem = (id: string | null | undefined): boolean => !!id && id in SEASONAL_ITEMS;

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const utc = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

const isRunning = (e: SeasonalEvent, today: string) => e.is_active && e.starts_on <= today && today <= e.ends_on;

/** The ids wearable today (`today` is a Cairo calendar date). */
export function activeSeasonalItems(events: readonly SeasonalEvent[], today: string): Set<string> {
  return new Set(events.filter((e) => isRunning(e, today)).flatMap((e) => e.items));
}

export type SeasonNow = SeasonalEvent & { daysLeft: number };
export type SeasonNext = SeasonalEvent & { daysUntil: number };

/** What the Seasonal tab shows. `daysLeft` counts today, so the last day reads as 1. */
export function seasonCalendar(events: readonly SeasonalEvent[], today: string): { now: SeasonNow[]; next: SeasonNext | null } {
  const now = events
    .filter((e) => isRunning(e, today))
    .map((e) => ({ ...e, daysLeft: daysBetween(today, e.ends_on) + 1 }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const upcoming = events.filter((e) => e.is_active && e.starts_on > today).sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))[0];
  return { now, next: upcoming ? { ...upcoming, daysUntil: daysBetween(today, upcoming.starts_on) } : null };
}

const layerOf = (manifest: SpriteManifest, key: SeasonalLayer): ManifestLayer | undefined => manifest.layers.find((l) => l.key === key);

/** The item worn on a layer when its seasonal choice is unavailable. */
function fallbackItem(config: AvatarConfig, manifest: SpriteManifest, key: SeasonalLayer): string | null {
  const layer = layerOf(manifest, key);
  const regularIds = (layer?.options ?? []).filter((o) => !o.seasonal).map((o) => o.id);
  const saved = config.regular?.[key];
  if (saved && regularIds.includes(saved)) return saved;
  if (!layer?.required) return null;
  const preferred = (manifest.defaults as unknown as Record<string, unknown>)[key];
  return typeof preferred === "string" && regularIds.includes(preferred) ? preferred : (regularIds[0] ?? null);
}

/**
 * What a person actually wears today: every seasonal item that no running event
 * lists is swapped for their regular item. The input is left untouched.
 */
export function resolveSeasonal(config: AvatarConfig, manifest: SpriteManifest, active: ReadonlySet<string>): AvatarConfig {
  let worn = config;
  for (const key of SEASONAL_LAYERS) {
    const id = config[key];
    const option = layerOf(manifest, key)?.options.find((o) => o.id === id);
    if (!option?.seasonal || active.has(option.id)) continue;
    worn = { ...worn, [key]: fallbackItem(config, manifest, key) };
  }
  return worn;
}

/** Choose an item on a layer, remembering the regular item a seasonal pick replaces. */
export function pickItem(config: AvatarConfig, manifest: SpriteManifest, key: SeasonalLayer, id: string | null): AvatarConfig {
  const seasonalIds = new Set((layerOf(manifest, key)?.options ?? []).filter((o) => o.seasonal).map((o) => o.id));
  const regular: RegularItems = { ...config.regular };
  const current = config[key] ?? null;
  if (id && seasonalIds.has(id)) {
    if (!current || !seasonalIds.has(current)) regular[key] = current;
  } else {
    delete regular[key];
  }
  const { regular: _previous, ...rest } = config;
  return { ...rest, [key]: id, ...(Object.keys(regular).length ? { regular } : {}) };
}

/**
 * Seasonal items in `next` the person may not newly select: out of season and
 * not already saved on that layer. Keeping an earlier choice is always allowed.
 */
export function blockedSeasonalItems(
  next: AvatarConfig,
  previous: AvatarConfig | null,
  manifest: SpriteManifest,
  active: ReadonlySet<string>,
): string[] {
  return SEASONAL_LAYERS.flatMap((key) => {
    const id = next[key];
    const seasonal = layerOf(manifest, key)?.options.find((o) => o.id === id)?.seasonal;
    return id && seasonal && !active.has(id) && previous?.[key] !== id ? [id] : [];
  });
}
