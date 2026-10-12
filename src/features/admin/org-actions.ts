"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { parseIp } from "@/lib/ip";
import { createClient } from "@/lib/supabase/server";
import { branchSchema, settingSchema } from "./schemas";

async function superAdmin() {
  const access = await actionAccess();
  return access && hasRole(access, "super_admin") ? access : null;
}

function parseCidrs(text: string): string[] | null {
  const lines = text.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const [base, prefix] = line.split("/");
    const ip = parseIp(base);
    if (!ip) return null;
    if (prefix !== undefined && !(Number(prefix) >= 0 && Number(prefix) <= ip.bits)) return null;
  }
  return lines;
}

export async function updateBranch(input: unknown): Promise<ActionResult> {
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const cidrs = parseCidrs(parsed.data.public_ips);
  if (!cidrs) return fail("validation.invalid", { public_ips: "validation.invalid" });

  const supabase = await createClient();
  const { id, name_en, name_ar, area, map_key, checkin_methods, is_active, latitude, longitude, geofence_radius_m } = parsed.data;
  const { error } = await supabase
    .from("branches")
    .update({ name_en, name_ar, area, map_key, checkin_methods, is_active, public_ips: cidrs, latitude, longitude, geofence_radius_m })
    .eq("id", id);
  if (error) return fail("common.unknownError");
  revalidatePath("/[locale]/admin/branches", "page");
  return ok();
}

export async function updateSetting(input: unknown): Promise<ActionResult> {
  const parsed = settingSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !hasRole(access, "super_admin", "hr")) return fail("common.notAllowed");
  if (!hasRole(access, "super_admin") && parsed.data.key !== "lateness_grace_minutes") {
    return fail("common.notAllowed");
  }
  let value: unknown;
  try {
    value = JSON.parse(parsed.data.value);
  } catch {
    return fail("admin.invalidJson", { value: "admin.invalidJson" });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .update({ value: value as never })
    .eq("key", parsed.data.key)
    .select("key");
  if (error || !data?.length) return fail(error ? "common.unknownError" : "common.notAllowed");
  revalidatePath("/[locale]/admin/settings", "page");
  return ok();
}

const deskSchema = z.object({
  branch_id: z.uuid(),
  zone_name: z.string().regex(/^desk-\d+$/),
  user_id: z.uuid().nullable(),
});

/** Assign or free a desk (super_admin and traffic). One desk per person per branch. */
export async function setDesk(input: unknown): Promise<ActionResult> {
  const parsed = deskSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !hasRole(access, "super_admin", "traffic_manager")) return fail("common.notAllowed");
  const supabase = await createClient();
  const { branch_id, zone_name, user_id } = parsed.data;
  if (user_id) {
    await supabase.from("desks").update({ assigned_user_id: null }).eq("branch_id", branch_id).eq("assigned_user_id", user_id);
  }
  const { error } = await supabase
    .from("desks")
    .upsert({ branch_id, zone_name, assigned_user_id: user_id }, { onConflict: "branch_id,zone_name" });
  if (error) return fail("common.notAllowed");
  revalidatePath("/[locale]/admin/branches", "page");
  return ok();
}

const chainSchema = z.array(
  z.object({ resolve: z.string().regex(/^(team_lead_of_requester|role:[a-z_]+|user:[0-9a-f-]{36})$/) }).strict(),
).max(6);
const fieldSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/),
  type: z.enum(["date", "text", "textarea", "number", "select", "card", "time"]),
  required: z.boolean().optional(),
  label_en: z.string().min(1).max(80),
  label_ar: z.string().min(1).max(80),
  options: z.array(z.string().regex(/^[a-z_]+$/)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const requestTypeSchema = z.object({
  id: z.uuid(),
  name_en: z.string().trim().min(1, "validation.required").max(80),
  name_ar: z.string().trim().min(1, "validation.required").max(80),
  is_active: z.boolean(),
  requires_attachment_after_days: z.number().int().min(0).max(60).nullable(),
  approval_chain: z.string(),
  form_schema: z.string(),
});

/** super_admin edits every type; hr edits leave types (row policies enforce it). */
export async function updateRequestType(input: unknown): Promise<ActionResult> {
  const parsed = requestTypeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !hasRole(access, "super_admin", "hr")) return fail("common.notAllowed");
  let chain: unknown;
  let form: unknown;
  try {
    chain = chainSchema.parse(JSON.parse(parsed.data.approval_chain));
  } catch {
    return fail("admin.invalidJson", { approval_chain: "admin.invalidJson" });
  }
  try {
    form = z.object({ fields: z.array(fieldSchema).max(20) }).parse(JSON.parse(parsed.data.form_schema));
  } catch {
    return fail("admin.invalidJson", { form_schema: "admin.invalidJson" });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("request_types")
    .update({
      name_en: parsed.data.name_en,
      name_ar: parsed.data.name_ar,
      is_active: parsed.data.is_active,
      requires_attachment_after_days: parsed.data.requires_attachment_after_days,
      approval_chain: chain as never,
      form_schema: form as never,
    })
    .eq("id", parsed.data.id)
    .select("id");
  if (!data?.length) return fail("common.notAllowed");
  revalidatePath("/[locale]/admin/request-types", "page");
  return ok();
}

export async function setDefaultApprover(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ department_id: z.uuid(), user_id: z.uuid().nullable() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data } = await supabase.from("departments").update({ default_approver_id: parsed.data.user_id }).eq("id", parsed.data.department_id).select("id");
  if (!data?.length) return fail("common.notAllowed");
  revalidatePath("/[locale]/admin/organisation", "page");
  return ok();
}

export async function updateTeam(input: unknown): Promise<ActionResult> {
  const parsed = z.object({
    id: z.uuid(),
    name_en: z.string().trim().min(1).max(80),
    name_ar: z.string().trim().min(1).max(80),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { id, ...patch } = parsed.data;
  const { data } = await supabase.from("teams").update(patch).eq("id", id).select("id");
  if (!data?.length) return fail("common.notAllowed");
  revalidatePath("/[locale]/admin/organisation", "page");
  return ok();
}
