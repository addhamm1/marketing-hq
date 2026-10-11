"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { randomKey, sha256Hex } from "@/lib/crypto";
import { env } from "@/lib/env";
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
  const { id, name_en, name_ar, area, map_key, checkin_methods, is_active } = parsed.data;
  const { error } = await supabase
    .from("branches")
    .update({ name_en, name_ar, area, map_key, checkin_methods, is_active, public_ips: cidrs })
    .eq("id", id);
  if (error) return fail("common.unknownError");
  revalidatePath("/[locale]/admin/branches", "page");
  return ok();
}

/** New kiosk key: shown once, only its hash is stored. */
export async function generateKioskKey(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = z.object({ branch_id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");

  const key = randomKey(32);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_kiosk_key_hash", {
    p_branch_id: parsed.data.branch_id,
    p_hash: sha256Hex(key),
  });
  if (error) return fail("common.unknownError");
  const locale = await getLocale();
  return ok({ url: `${env.appUrl}/${locale}/kiosk/${parsed.data.branch_id}?key=${key}` });
}

export async function rotateQrSecret(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ branch_id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_rotate_qr_secret", { p_branch_id: parsed.data.branch_id });
  return error ? fail("common.unknownError") : ok();
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
