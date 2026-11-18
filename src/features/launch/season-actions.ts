"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { seasonSchema, slugify } from "./schemas";

async function superAdmin() {
  const access = await actionAccess();
  return access && hasRole(access, "super_admin") ? access : null;
}

/** Adds a seasonal event, or edits one when `id` is given. */
export async function saveSeason(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid().optional(), values: seasonSchema }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const { id, values } = parsed.data;
  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("seasonal_events").update(values).eq("id", id).select("id");
    if (error) return fail(dbError(error));
    if (!data.length) return fail("common.notAllowed");
  } else {
    const key = `${slugify(values.name_en) || "season"}-${values.starts_on.slice(0, 4)}`;
    const { error } = await supabase.from("seasonal_events").insert({ ...values, key });
    if (error?.code === "23505") return fail("seasonsAdmin.errors.duplicate", { name_en: "seasonsAdmin.errors.duplicate" });
    if (error) return fail(dbError(error));
  }
  revalidatePath("/[locale]/admin/seasons", "page");
  return ok();
}
