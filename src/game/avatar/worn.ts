import { cairoDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import { type SeasonalEvent, activeSeasonalItems, resolveSeasonal } from "./seasonal";
import type { AvatarConfig, SpriteManifest } from "./types";

/**
 * Browser path from a saved config to what the person wears today. The map and
 * portraits both go through `wornConfig`, so an ended event falls back everywhere.
 */

const EVENTS_TTL_MS = 30 * 60 * 1000;

let cached: { at: number; events: Promise<SeasonalEvent[]> } | null = null;

function loadEvents(): Promise<SeasonalEvent[]> {
  if (cached && Date.now() - cached.at < EVENTS_TTL_MS) return cached.events;
  const events = Promise.resolve(
    createClient().from("seasonal_events").select("key, name_en, name_ar, starts_on, ends_on, items, is_active"),
  ).then(({ data, error }) => {
    if (error) throw error;
    return data ?? [];
  });
  const entry = { at: Date.now(), events };
  cached = entry;
  // A failed read wears regular items for now and is retried on the next render.
  events.catch(() => {
    if (cached === entry) cached = null;
  });
  return events;
}

/** The config to draw today: seasonal items no running event lists become the regular item. */
export async function wornConfig(config: AvatarConfig, manifest: SpriteManifest): Promise<AvatarConfig> {
  const events = await loadEvents().catch(() => []);
  return resolveSeasonal(config, manifest, activeSeasonalItems(events, cairoDateString()));
}
