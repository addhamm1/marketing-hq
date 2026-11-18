import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Person } from "@/features/boards/types";
import type { AvatarConfig } from "@/game/avatar/types";
import { cairoDateString, cairoInstant } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";
import { type Celebration, KUDOS_PAGE, type Kudos, UPCOMING_DAYS } from "./types";

type Client = SupabaseClient<Database>;

export type CelebrationsData = {
  today: string;
  kudos: Kudos[];
  celebrations: Celebration[] | null;
  people: Person[];
  avatars: Record<string, AvatarConfig>;
  /** People the viewer has already wished a happy birthday today. */
  wished: string[];
};

export async function fetchCelebrations(supabase: Client, viewerId: string): Promise<CelebrationsData> {
  const today = cairoDateString();
  const [kudos, upcoming, people, avatars, wished] = await Promise.all([
    supabase.from("kudos").select("id, from_id, to_id, badge, message, created_at").order("created_at", { ascending: false }).limit(KUDOS_PAGE),
    supabase.rpc("upcoming_celebrations", { p_from: today, p_days: UPCOMING_DAYS }),
    supabase.rpc("public_profiles"),
    supabase.from("avatars").select("user_id, config"),
    supabase.from("kudos").select("to_id").eq("from_id", viewerId).eq("badge", "birthday").gte("created_at", cairoInstant(today).toISOString()),
  ]);
  return {
    today,
    kudos: (kudos.data ?? []) as Kudos[],
    celebrations: upcoming.error ? null : ((upcoming.data ?? []) as Celebration[]),
    people: ((people.data ?? []) as Person[]).sort((a, b) => a.display_name.localeCompare(b.display_name)),
    avatars: Object.fromEntries((avatars.data ?? []).map((a) => [a.user_id, a.config as unknown as AvatarConfig])),
    wished: (wished.data ?? []).map((w) => w.to_id),
  };
}
