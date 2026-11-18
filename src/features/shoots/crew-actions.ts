"use server";

import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { crewAddSchema, crewUpdateSchema, rowRefSchema } from "./schemas";

export async function addCrew(input: unknown): Promise<ActionResult> {
  const parsed = crewAddSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { shoot_id, kind, user_id, external_name, role, call_time } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("shoot_crew").insert({
    shoot_id,
    user_id: kind === "member" ? user_id : null,
    external_name: kind === "outside" ? external_name : null,
    role,
    call_time,
  });
  if (error?.code === "23505") return fail("shoots.errors.alreadyCrew");
  return error ? fail(dbError(error)) : ok();
}

export async function updateCrew(input: unknown): Promise<ActionResult> {
  const parsed = crewUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const { id, shoot_id, ...patch } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_crew").update(patch).eq("id", id).eq("shoot_id", shoot_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

export async function removeCrew(input: unknown): Promise<ActionResult> {
  const parsed = rowRefSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_crew").delete().eq("id", parsed.data.id).eq("shoot_id", parsed.data.shoot_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}
