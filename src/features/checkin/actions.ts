"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { MAX_ACCURACY_M, nearestBranch } from "@/lib/geo";
import { clientIp, matchCidr } from "@/lib/ip";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkInSchema, checkOutSchema, type Location } from "./schemas";

const ERRORS = ["method_not_allowed", "no_wfh_today", "location_required", "low_accuracy", "invalid_location"];

function checkInError(message: string | undefined) {
  const m = message ?? "";
  if (m.startsWith("already_checked_in:")) return fail("checkin.errors.already", undefined, { branch: m.split(":")[1] ?? "" });
  if (m.includes("out_of_range:")) return fail("checkin.errors.out_of_range_short");
  for (const k of ERRORS) if (m.includes(k)) return fail(`checkin.errors.${k}`);
  return fail("common.unknownError");
}

const locArgs = (l: Location | null | undefined) =>
  l ? { p_lat: l.lat, p_lng: l.lng, p_accuracy_m: l.accuracy } : {};

/** Result data: the branch name for a branch check-in, so the UI can say where. */
export type CheckInData = { branch: string | null };

/**
 * Verifies the location (geofence) or the Wi-Fi IP on the server, then records
 * the check-in with the service role (check_in is not callable by users and
 * repeats the geofence check itself).
 */
export async function checkIn(input: unknown): Promise<ActionResult<CheckInData>> {
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !access.is_marketing) return fail("common.notAllowed");
  const v = parsed.data;
  const admin = createAdminClient();
  const locale = await getLocale();
  let verify: Record<string, unknown> = {};
  let branchId: string | null = null;
  let branchName: string | null = null;

  if (v.method === "gps") {
    if (v.location.accuracy > MAX_ACCURACY_M) {
      return fail("checkin.errors.low_accuracy_m", undefined, { accuracy: Math.round(v.location.accuracy) });
    }
    const { data: branches } = await admin
      .from("branches")
      .select("id, name_en, name_ar, latitude, longitude, geofence_radius_m")
      .eq("is_active", true)
      .contains("checkin_methods", ["gps"])
      .not("latitude", "is", null);
    const near = nearestBranch({ ...v.location, accuracyM: v.location.accuracy }, branches ?? []);
    if (near.kind === "none") return fail("checkin.errors.no_branches");
    const name = locale === "ar" ? near.branch.name_ar : near.branch.name_en;
    if (near.kind === "outside") {
      return fail("checkin.errors.out_of_range", undefined, { branch: name, distance: Math.round(near.distanceM) });
    }
    verify = { geofence: { radius_m: near.branch.geofence_radius_m, distance_m: Math.round(near.distanceM) } };
    branchId = near.branch.id;
    branchName = name;
  } else if (v.method === "wifi") {
    const ip = clientIp(await headers());
    const { data: branch } = await admin.from("branches").select("public_ips, name_en, name_ar").eq("id", v.branch_id).single();
    const matched = ip && branch ? matchCidr(ip, branch.public_ips.map(String)) : null;
    if (!matched || !branch) return fail("checkin.errors.ip_not_matched");
    verify = { ipMatched: matched };
    branchId = v.branch_id;
    branchName = locale === "ar" ? branch.name_ar : branch.name_en;
  }

  const { error } = await admin.rpc("check_in", {
    p_user_id: access.user_id,
    p_method: v.method,
    p_verify: verify as never,
    ...(branchId ? { p_branch_id: branchId } : {}),
    ...(v.method === "home" ? {} : locArgs(v.location)),
    ...(v.method === "field"
      ? { p_card_id: v.card_id ?? undefined, p_note: v.note || undefined, p_place: v.place || undefined }
      : {}),
  });
  return error ? checkInError(error.message) : ok({ branch: branchName });
}

/** Check-out; the location is best effort and never blocks it. */
export async function checkOut(input?: unknown): Promise<ActionResult> {
  const parsed = checkOutSchema.safeParse(input);
  const location = parsed.success ? (parsed.data?.location ?? null) : null;
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = location
    ? await supabase.rpc("check_out", { p_lat: location.lat, p_lng: location.lng, p_accuracy_m: location.accuracy })
    : await supabase.rpc("check_out");
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
