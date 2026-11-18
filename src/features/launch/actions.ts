"use server";

import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { allowanceChanges } from "./allowance-plan";
import { myBirthdaySchema } from "./birthday";
import { isStaffMember } from "./checks";
import { allowanceApplySchema, allowancePreviewSchema } from "./schemas";

/** People set their own birthday (month and day only) and whether they are celebrated. */
export async function saveMyBirthday(input: unknown): Promise<ActionResult> {
  const parsed = myBirthdaySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(parsed.data).eq("id", access.user_id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Current allowance of every staff member for one leave type and year. */
async function staffAllowances(supabase: Supabase, typeId: string, year: number) {
  const [profiles, roles, balances] = await Promise.all([
    supabase.from("profiles").select("id, status").eq("status", "active"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("leave_balances").select("user_id, allowance").eq("type_id", typeId).eq("year", year),
  ]);
  const failed = profiles.error ?? roles.error ?? balances.error;
  if (failed) return null;
  const rolesBy = new Map<string, string[]>();
  for (const r of roles.data ?? []) rolesBy.set(r.user_id, [...(rolesBy.get(r.user_id) ?? []), r.role]);
  const current = new Map((balances.data ?? []).map((b) => [b.user_id, Number(b.allowance)]));
  return (profiles.data ?? [])
    .filter((p) => isStaffMember({ status: p.status, roles: rolesBy.get(p.id) ?? [] }))
    .map((p) => ({ user_id: p.id, allowance: current.get(p.id) ?? 0 }));
}

async function leaveAdmin() {
  const access = await actionAccess();
  return access && hasRole(access, "hr", "super_admin") ? access : null;
}

/** What a bulk change would touch. Changes nothing. */
export async function previewAllowance(input: unknown): Promise<ActionResult<{ current: number[] }>> {
  const parsed = allowancePreviewSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await leaveAdmin())) return fail("common.notAllowed");
  const rows = await staffAllowances(await createClient(), parsed.data.type_id, parsed.data.year);
  return rows ? ok({ current: rows.map((r) => r.allowance) }) : fail("common.unknownError");
}

/**
 * Sets one allowance for all staff, after the admin confirms in the dialog.
 * Days already used are kept; custom allowances change only with `overwrite`.
 */
export async function applyAllowance(input: unknown): Promise<ActionResult<{ changed: number }>> {
  const parsed = allowanceApplySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await leaveAdmin())) return fail("common.notAllowed");
  const { type_id, year, allowance, overwrite } = parsed.data;
  const supabase = await createClient();
  const rows = await staffAllowances(supabase, type_id, year);
  if (!rows) return fail("common.unknownError");
  const changing = rows.filter((r) => allowanceChanges(r.allowance, allowance, overwrite));
  if (!changing.length) return ok({ changed: 0 });
  const { error } = await supabase
    .from("leave_balances")
    .upsert(changing.map((r) => ({ user_id: r.user_id, type_id, year, allowance })), { onConflict: "user_id,type_id,year" });
  return error ? fail(dbError(error)) : ok({ changed: changing.length });
}
