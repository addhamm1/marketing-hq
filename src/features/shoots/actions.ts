"use server";

import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { shootIdSchema, shootRow, shootSchema, shootStatusSchema } from "./schemas";
import { z } from "zod";

export async function createShoot(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = shootSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shoots")
    .insert({ ...shootRow(parsed.data), created_by: access.user_id })
    .select("id")
    .single();
  if (error || !data) return fail(dbError(error));
  return ok({ id: data.id });
}

export async function updateShoot(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), values: shootSchema }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shoots")
    .update(shootRow(parsed.data.values))
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

export async function setShootStatus(input: unknown): Promise<ActionResult> {
  const parsed = shootStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shoots")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

/** Soft delete. Crew can edit a shoot; only its producer, creator or a manager can remove it. */
export async function archiveShoot(input: unknown): Promise<ActionResult> {
  const parsed = shootIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data: shoot } = await supabase.from("shoots").select("producer_id, created_by").eq("id", parsed.data.id).maybeSingle();
  if (!shoot) return fail("common.notAllowed");
  const manager = hasRole(access, "super_admin", "traffic_manager", "team_lead");
  if (!manager && shoot.producer_id !== access.user_id && shoot.created_by !== access.user_id) return fail("common.notAllowed");
  const { data, error } = await supabase
    .from("shoots")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}
