import "server-only";
import { z } from "zod";
import type { Access } from "@/lib/auth/access";
import { hasRole } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import type { ShootStatus } from "./schemas";

export type ShootListItem = {
  id: string;
  title: string;
  shoot_on: string;
  call_time: string;
  status: ShootStatus;
  location_name: string | null;
  branch: { name_en: string; name_ar: string } | null;
  crew: number;
  confirmed: number;
};

export async function listShoots(): Promise<ShootListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shoots")
    .select("id, title, shoot_on, call_time, status, location_name, branches(name_en, name_ar), shoot_crew(confirmed)")
    .is("archived_at", null)
    .order("shoot_on", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []).map(({ branches, shoot_crew, ...s }) => ({
    ...s,
    branch: branches,
    crew: shoot_crew.length,
    confirmed: shoot_crew.filter((c) => c.confirmed).length,
  }));
}

export async function canCreateShoot() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_marketing_writer");
  return !!data;
}

export async function getBranchOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select("id, name_en, name_ar").eq("is_active", true).order("name_en");
  if (error) throw error;
  return data ?? [];
}

/** Everything on a shoot's page. Null when the id is wrong, archived or not visible to the caller. */
export async function getShoot(id: string, access: Access) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data: shoot, error } = await supabase
    .from("shoots")
    .select("*, branches(id, name_en, name_ar, latitude, longitude)")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!shoot) return null;

  const [crew, shots, equipment, cards, canEdit] = await Promise.all([
    supabase.from("shoot_crew").select("id, user_id, external_name, role, call_time, confirmed").eq("shoot_id", id).order("created_at"),
    supabase.from("shoot_shots").select("id, position, description, shot_type, card_id, done, notes").eq("shoot_id", id).order("position").order("created_at"),
    supabase.from("shoot_equipment").select("id, item, quantity, owner_id, packed, returned").eq("shoot_id", id).order("created_at"),
    supabase.from("shoot_cards").select("cards(id, title, stage)").eq("shoot_id", id),
    supabase.rpc("can_edit_shoot", { p_shoot_id: id }),
  ]);
  for (const r of [crew, shots, equipment, cards]) if (r.error) throw r.error;

  const manager = hasRole(access, "super_admin", "traffic_manager", "team_lead");
  return {
    shoot,
    crew: crew.data ?? [],
    shots: shots.data ?? [],
    equipment: equipment.data ?? [],
    // A card the viewer cannot open comes back empty: leave it out.
    cards: (cards.data ?? []).flatMap((c) => (c.cards ? [c.cards] : [])),
    canEdit: !!canEdit.data,
    canArchive: !!canEdit.data && (manager || shoot.producer_id === access.user_id || shoot.created_by === access.user_id),
  };
}

export type ShootPage = NonNullable<Awaited<ReturnType<typeof getShoot>>>;
