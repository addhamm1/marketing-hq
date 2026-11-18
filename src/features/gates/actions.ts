"use server";

import { revalidatePath } from "next/cache";
import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { monthInfo } from "./month";
import { canManageGates } from "./perms";
import { cardLinkSchema, cardSearchSchema, idSchema, itemSchema, statusSchema } from "./schemas";

const refresh = () => revalidatePath("/[locale]/gates", "page");

async function isManager() {
  return canManageGates(await actionAccess());
}

/** Owners, traffic and super admins update progress; the database checks which. */
export async function setGateStatus(input: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { id, status, note } = parsed.data;
  const { error } = await supabase.rpc("set_gate_status", { p_id: id, p_status: status, p_note: note });
  if (error) return fail(dbError(error));
  refresh();
  return ok();
}

export async function saveGateItem(input: unknown): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { id, ...v } = parsed.data;

  const { data: original } = id
    ? await supabase.from("gate_items").select("month, starts_on, due_on").eq("id", id).maybeSingle()
    : { data: null };
  if (id && !original) return fail("gates.errors.notFound");

  // A gate rolled back over a month end may keep its date; new dates stay in the month.
  const info = monthInfo(original ? original.month.slice(0, 7) : v.month);
  const outside = (value: string, was?: string) => (value < info.first || value > info.last) && value !== was;
  const fieldErrors: Record<string, string> = {};
  if (outside(v.starts_on, original?.starts_on)) fieldErrors.starts_on = "gates.errors.outsideMonth";
  if (outside(v.due_on, original?.due_on)) fieldErrors.due_on = "gates.errors.outsideMonth";
  if (Object.keys(fieldErrors).length) return fail("validation.invalid", fieldErrors);

  const { error } = await supabase.rpc("save_gate_item", {
    // The function adds a new item when the id is null.
    p_id: id as string,
    p: { ...v, month: info.first, owner_id: v.owner_id ?? "" },
  });
  if (error?.code === "23505") return fail("validation.invalid", { due_on: "gates.errors.dateTaken" });
  if (error) return fail(dbError(error));
  refresh();
  return ok();
}

export async function deleteGateItem(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_gate_item", { p_id: parsed.data });
  if (error) return fail(dbError(error));
  refresh();
  return ok();
}

export async function linkGateCard(input: unknown): Promise<ActionResult> {
  const parsed = cardLinkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.from("gate_item_cards").insert(parsed.data);
  // Already linked is the outcome the caller wanted.
  if (error && error.code !== "23505") return fail(dbError(error));
  refresh();
  return ok();
}

export async function unlinkGateCard(input: unknown): Promise<ActionResult> {
  const parsed = cardLinkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase
    .from("gate_item_cards")
    .delete()
    .eq("item_id", parsed.data.item_id)
    .eq("card_id", parsed.data.card_id);
  if (error) return fail(dbError(error));
  refresh();
  return ok();
}

export type CardHit = { id: string; title: string };

/** Cards the caller can see whose title contains the search words. */
export async function searchGateCards(input: unknown): Promise<ActionResult<CardHit[]>> {
  const parsed = cardSearchSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const pattern = `%${parsed.data.replace(/[\\%_]/g, "\\$&")}%`;
  const { data, error } = await supabase
    .from("cards")
    .select("id, title")
    .ilike("title", pattern)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(8);
  if (error) return fail(dbError(error));
  return ok((data ?? []) as CardHit[]);
}
