"use server";

import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { rowRefSchema, shotAddSchema, shotDoneSchema, shotOrderSchema, shotUpdateSchema } from "./schemas";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** A shot can only point at a card already linked to the same shoot. */
async function cardIsLinked(supabase: Supabase, shootId: string, cardId: string | null) {
  if (!cardId) return true;
  const { data } = await supabase.from("shoot_cards").select("card_id").eq("shoot_id", shootId).eq("card_id", cardId).maybeSingle();
  return !!data;
}

export async function addShot(input: unknown): Promise<ActionResult> {
  const parsed = shotAddSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  if (!(await cardIsLinked(supabase, parsed.data.shoot_id, parsed.data.card_id))) return fail("common.notAllowed");
  const { data: last } = await supabase
    .from("shoot_shots")
    .select("position")
    .eq("shoot_id", parsed.data.shoot_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("shoot_shots").insert({ ...parsed.data, position: (last?.position ?? -1) + 1 });
  return error ? fail(dbError(error)) : ok();
}

export async function updateShot(input: unknown): Promise<ActionResult> {
  const parsed = shotUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { id, shoot_id, ...patch } = parsed.data;
  const supabase = await createClient();
  if (!(await cardIsLinked(supabase, shoot_id, patch.card_id))) return fail("common.notAllowed");
  const { data, error } = await supabase.from("shoot_shots").update(patch).eq("id", id).eq("shoot_id", shoot_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

export async function setShotDone(input: unknown): Promise<ActionResult> {
  const parsed = shotDoneSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { id, shoot_id, done } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_shots").update({ done }).eq("id", id).eq("shoot_id", shoot_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

export async function removeShot(input: unknown): Promise<ActionResult> {
  const parsed = rowRefSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_shots").delete().eq("id", parsed.data.id).eq("shoot_id", parsed.data.shoot_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

/** Saves a new order. `ids` must be exactly this shoot's shots. */
export async function reorderShots(input: unknown): Promise<ActionResult> {
  const parsed = shotOrderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { shoot_id, ids } = parsed.data;
  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase.from("shoot_shots").select("id, position").eq("shoot_id", shoot_id);
  if (readError) return fail(dbError(readError));
  const current = new Map((rows ?? []).map((r) => [r.id, r.position]));
  if (new Set(ids).size !== ids.length || ids.length !== current.size || ids.some((id) => !current.has(id))) {
    return fail("shoots.errors.stale");
  }
  const changed = ids.map((id, position) => ({ id, position })).filter((r) => current.get(r.id) !== r.position);
  const results = await Promise.all(
    changed.map((r) => supabase.from("shoot_shots").update({ position: r.position }).eq("id", r.id).eq("shoot_id", shoot_id).select("id")),
  );
  const failed = results.find((r) => r.error || !r.data?.length);
  return failed ? fail(failed.error ? dbError(failed.error) : "common.notAllowed") : ok();
}
