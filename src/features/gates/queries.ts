import "server-only";
import { fetchPeople } from "@/features/boards/queries";
import type { Person } from "@/features/boards/types";
import { createClient } from "@/lib/supabase/server";
import type { GateItem, GateTemplate, GateTrack, LinkedCard } from "./types";

export type GateMonthData = { tracks: GateTrack[]; items: GateItem[]; cards: LinkedCard[]; people: Person[] };

/** Builds the month if needed, then reads it. Null when the month is out of reach. */
export async function loadGateMonth(month: string): Promise<GateMonthData | null> {
  const supabase = await createClient();
  const first = `${month}-01`;
  const { error: buildError } = await supabase.rpc("ensure_gate_month", { p_month: first });
  if (buildError?.code === "22023") return null;
  if (buildError) throw new Error("gates: could not open the month");

  const [tracks, items, people] = await Promise.all([
    supabase.from("gate_tracks").select("*").order("position"),
    supabase.from("gate_items").select("*").eq("month", first).order("starts_on").order("position"),
    fetchPeople(supabase),
  ]);
  if (tracks.error || items.error) throw new Error("gates: could not read the month");

  const ids = (items.data ?? []).map((i) => i.id);
  const links = ids.length
    ? await supabase.from("gate_item_cards").select("item_id, card_id, cards(title)").in("item_id", ids)
    : { data: [], error: null };
  if (links.error) throw new Error("gates: could not read linked cards");

  const cards = (links.data ?? []).flatMap((l) => (l.cards ? [{ item_id: l.item_id, card_id: l.card_id, title: l.cards.title }] : []));
  const used = new Set((items.data ?? []).map((i) => i.track_id));
  return {
    tracks: (tracks.data ?? []).filter((t) => t.is_active || used.has(t.id)),
    items: items.data ?? [],
    cards,
    people,
  };
}

export type RhythmData = { tracks: GateTrack[]; templates: GateTemplate[]; people: Person[] };

export async function loadRhythm(): Promise<RhythmData> {
  const supabase = await createClient();
  const [tracks, templates, people] = await Promise.all([
    supabase.from("gate_tracks").select("*").order("position"),
    supabase.from("gate_templates").select("*").order("position").order("start_day"),
    fetchPeople(supabase),
  ]);
  if (tracks.error || templates.error) throw new Error("gates: could not read the rhythm");
  return { tracks: tracks.data ?? [], templates: templates.data ?? [], people };
}
