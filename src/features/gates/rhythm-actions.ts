"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canManageGates } from "./perms";
import { idSchema, templateSchema, trackKey, trackSchema } from "./schemas";

function refresh() {
  revalidatePath("/[locale]/gates", "page");
  revalidatePath("/[locale]/gates/rhythm", "page");
}

async function isManager() {
  return canManageGates(await actionAccess());
}

export async function saveGateTrack(input: unknown): Promise<ActionResult> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  if (id) {
    const { data, error } = await supabase.from("gate_tracks").update(values).eq("id", id).select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("gates.errors.notFound");
  } else {
    const key = trackKey(values.name_en, randomUUID().slice(0, 6));
    const { error } = await supabase.from("gate_tracks").insert({ ...values, key });
    if (error) return fail(dbError(error));
  }
  refresh();
  return ok();
}

export async function saveGateTemplate(input: unknown): Promise<ActionResult> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = await supabase.rpc("save_gate_template", {
    // The function adds a new template when the id is null.
    p_id: id as string,
    p: { ...values, owner_id: values.owner_id ?? "" },
  });
  if (error) return fail(dbError(error));
  refresh();
  return ok();
}

export async function deleteGateTemplate(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_gate_template", { p_id: parsed.data });
  if (error) return fail(dbError(error));
  refresh();
  return ok();
}
