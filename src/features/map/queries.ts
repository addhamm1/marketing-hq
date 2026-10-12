import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvatarConfig } from "@/game/avatar/types";
import type { Database } from "@/lib/supabase/database.types";
import type { MapData, MapPerson } from "./types";

type Client = SupabaseClient<Database>;

export async function fetchMapData(supabase: Client, locale: string): Promise<MapData> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [branches, sessions, people, teams, desks, avatars, cards, absences] = await Promise.all([
    supabase.from("branches").select("id, name_en, name_ar, map_key").eq("is_active", true).order("name_en"),
    supabase.rpc("who_is_in", {}),
    supabase.from("profiles").select("id, full_name, display_name, title, team_id, presence, home_branch_id").eq("status", "active"),
    supabase.from("teams").select("id, slug, color"),
    supabase.from("desks").select("branch_id, zone_name, assigned_user_id"),
    supabase.from("avatars").select("user_id, config"),
    supabase
      .from("cards")
      .select("id, title, board_id, stage_entered_at, card_assignees!inner(user_id)")
      .eq("stage", "production")
      .is("archived_at", null)
      .order("stage_entered_at", { ascending: false })
      .limit(300),
    supabase.rpc("team_absences", { p_from: today, p_to: today }),
  ]);

  const currentCards: MapData["currentCards"] = {};
  for (const c of cards.data ?? []) {
    for (const a of c.card_assignees as { user_id: string }[]) {
      currentCards[a.user_id] ??= { id: c.id, title: c.title, board_id: c.board_id };
    }
  }

  return {
    branches: (branches.data ?? []).map((b) => ({ id: b.id, name: locale === "ar" ? b.name_ar : b.name_en, mapKey: b.map_key })),
    sessions: sessions.data ?? [],
    people: (people.data ?? []).map(
      (p): MapPerson => ({
        id: p.id,
        name: p.display_name || p.full_name,
        title: p.title,
        teamId: p.team_id,
        presence: p.presence,
        homeBranchId: p.home_branch_id,
      }),
    ),
    teamColors: Object.fromEntries((teams.data ?? []).map((t) => [t.id, t.color])),
    teamAccents: Object.fromEntries((teams.data ?? []).map((t) => [t.slug, t.color])),
    desks: desks.data ?? [],
    avatars: Object.fromEntries((avatars.data ?? []).map((a) => [a.user_id, a.config as unknown as AvatarConfig])),
    currentCards,
    onLeaveToday: [...new Set((absences.data ?? []).filter((a) => a.category === "leave").map((a) => a.user_id))],
  };
}
