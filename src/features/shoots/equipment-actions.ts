"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, missingKit } from "./helpers";
import { cardSearchSchema, equipmentAddSchema, equipmentUpdateSchema, rowRefSchema, shootCardSchema } from "./schemas";

export async function addEquipment(input: unknown): Promise<ActionResult> {
  const parsed = equipmentAddSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.from("shoot_equipment").insert(parsed.data);
  return error ? fail(dbError(error)) : ok();
}

export async function updateEquipment(input: unknown): Promise<ActionResult> {
  const parsed = equipmentUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { id, shoot_id, ...patch } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_equipment").update(patch).eq("id", id).eq("shoot_id", shoot_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

export async function removeEquipment(input: unknown): Promise<ActionResult> {
  const parsed = rowRefSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_equipment").delete().eq("id", parsed.data.id).eq("shoot_id", parsed.data.shoot_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

/** One tap: adds whatever part of the default kit is not on the list yet. */
export async function addDefaultKit(input: unknown): Promise<ActionResult<{ added: number }>> {
  const parsed = z.object({ shoot_id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { shoot_id } = parsed.data;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from("shoot_equipment").select("item").eq("shoot_id", shoot_id);
  if (readError) return fail(dbError(readError));
  const items = missingKit((existing ?? []).map((e) => e.item));
  if (!items.length) return ok({ added: 0 });
  const { error } = await supabase
    .from("shoot_equipment")
    .insert(items.map((k) => ({ shoot_id, item: locale === "ar" ? k.ar : k.en, quantity: k.quantity })));
  return error ? fail(dbError(error)) : ok({ added: items.length });
}

export async function linkCard(input: unknown): Promise<ActionResult> {
  const parsed = shootCardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.from("shoot_cards").upsert(parsed.data, { onConflict: "shoot_id,card_id", ignoreDuplicates: true });
  return error ? fail(dbError(error)) : ok();
}

/** Unlinks the card and clears it from any shot that pointed at it. */
export async function unlinkCard(input: unknown): Promise<ActionResult> {
  const parsed = shootCardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { shoot_id, card_id } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_cards").delete().eq("shoot_id", shoot_id).eq("card_id", card_id).select("card_id");
  if (error) return fail(dbError(error));
  if (!data.length) return fail("common.notAllowed");
  const { error: shotError } = await supabase.from("shoot_shots").update({ card_id: null }).eq("shoot_id", shoot_id).eq("card_id", card_id);
  return shotError ? fail(dbError(shotError)) : ok();
}

export async function searchCards(input: unknown): Promise<ActionResult<{ id: string; title: string }[]>> {
  const parsed = cardSearchSchema.safeParse(input);
  if (!parsed.success) return ok([]);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("id, title")
    .ilike("title", `%${escapeLike(parsed.data.q)}%`)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(8);
  return error ? fail(dbError(error)) : ok(data ?? []);
}
