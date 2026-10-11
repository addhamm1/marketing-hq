"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { verifyQrToken } from "@/lib/crypto";
import { clientIp, matchCidr } from "@/lib/ip";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const checkInSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("wifi"), branch_id: z.uuid() }),
  z.object({ method: z.literal("qr"), branch_id: z.uuid(), token: z.string().regex(/^[A-Z2-7]{10}$/) }),
  z.object({ method: z.literal("field"), card_id: z.uuid().nullable().optional(), note: z.string().trim().max(300).optional() }),
  z.object({ method: z.literal("home") }),
]);

function checkInError(message: string | undefined) {
  const m = message ?? "";
  if (m.startsWith("already_checked_in:")) return fail("checkin.errors.already", undefined, { branch: m.split(":")[1] ?? "" });
  for (const k of ["method_not_allowed", "no_wfh_today"]) if (m.includes(k)) return fail(`checkin.errors.${k}`);
  return fail("common.unknownError");
}

/**
 * Verifies the Wi-Fi IP or the QR token on the server, then records the
 * check-in with the service role (check_in is not callable by users).
 */
export async function checkIn(input: unknown): Promise<ActionResult> {
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !access.is_marketing) return fail("common.notAllowed");
  const v = parsed.data;
  const admin = createAdminClient();
  let verify: { ipMatched?: string; qr?: boolean } = {};
  let branchId: string | null = null;

  if (v.method === "wifi") {
    const ip = clientIp(await headers());
    const { data: branch } = await admin.from("branches").select("public_ips").eq("id", v.branch_id).single();
    const matched = ip && branch ? matchCidr(ip, branch.public_ips.map(String)) : null;
    if (!matched) return fail("checkin.errors.ip_not_matched");
    verify = { ipMatched: matched };
    branchId = v.branch_id;
  } else if (v.method === "qr") {
    const { data: secret } = await admin.from("branch_secrets").select("hmac_secret").eq("branch_id", v.branch_id).single();
    if (!secret || !verifyQrToken(secret.hmac_secret, v.branch_id, v.token)) return fail("checkin.errors.qr_expired");
    verify = { qr: true };
    branchId = v.branch_id;
  }

  const { error } = await admin.rpc("check_in", {
    p_user_id: access.user_id,
    p_method: v.method,
    p_branch_id: branchId as string,
    p_verify: verify,
    p_card_id: v.method === "field" ? (v.card_id ?? undefined) : undefined,
    p_note: v.method === "field" ? v.note : undefined,
  });
  return error ? checkInError(error.message) : ok();
}

export async function checkOut(): Promise<ActionResult> {
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_out");
  return error ? fail(error.message.includes("not_checked_in") ? "checkin.errors.not_checked_in" : "common.unknownError") : ok();
}

export async function confirmAutoCheckout(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ session_id: z.uuid(), actual_out: z.iso.datetime() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_auto_checkout", { p_session_id: parsed.data.session_id, p_actual_out: parsed.data.actual_out });
  if (error) return fail(error.message.includes("invalid_time") ? "checkin.errors.invalid_time" : "common.notAllowed");
  return ok();
}
