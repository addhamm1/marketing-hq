"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

async function hr() {
  const access = await actionAccess();
  return access && hasRole(access, "hr", "super_admin") ? access : null;
}

const allowanceSchema = z.object({ user_id: z.uuid(), type_id: z.uuid(), year: z.number().int().min(2020).max(2100), allowance: z.number().min(0).max(365) });

export async function setAllowance(input: unknown): Promise<ActionResult> {
  const parsed = allowanceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await hr())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.from("leave_balances").upsert(parsed.data, { onConflict: "user_id,type_id,year" });
  return error ? fail("common.notAllowed") : ok();
}

const holidaySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.invalid"),
  name_en: z.string().trim().min(1, "validation.required").max(120),
  name_ar: z.string().trim().min(1, "validation.required").max(120),
  is_half_day: z.boolean(),
});

export async function addHoliday(input: unknown): Promise<ActionResult> {
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await hr())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.from("holidays").upsert(parsed.data, { onConflict: "day" });
  if (error) return fail("common.notAllowed");
  revalidatePath("/[locale]/admin/leave", "page");
  return ok();
}

export async function deleteHoliday(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await hr())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.from("holidays").delete().eq("id", parsed.data.id);
  if (error) return fail("common.notAllowed");
  revalidatePath("/[locale]/admin/leave", "page");
  return ok();
}
