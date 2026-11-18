"use server";

import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { digestSchema, endpointSchema, subscriptionSchema } from "./schemas";

const UNIQUE_VIOLATION = "23505";

/** Registers this device for the signed-in person and turns phone notifications on. */
export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");

  const { endpoint, p256dh, auth, userAgent } = parsed.data;
  const supabase = await createClient();
  // Subscriptions cannot be updated, so a renewed one replaces the old row.
  const removed = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", access.user_id);
  if (removed.error) return fail("pushSettings.errors.saveFailed");

  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: access.user_id, endpoint, p256dh, auth, user_agent: userAgent ?? null });
  // Someone else signed in on this browser earlier and still holds its subscription.
  if (error?.code === UNIQUE_VIOLATION) return fail("pushSettings.errors.deviceTaken");
  if (error) return fail("pushSettings.errors.saveFailed");

  const pref = await supabase
    .from("notification_preferences")
    .upsert({ user_id: access.user_id, push_enabled: true }, { onConflict: "user_id" });
  return pref.error ? fail("pushSettings.errors.saveFailed") : ok();
}

/** Removes this device. With no device left, phone notifications are off for the person. */
export async function removePushSubscription(input: unknown): Promise<ActionResult> {
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", access.user_id);
  if (error) return fail("pushSettings.errors.saveFailed");

  const { count, error: countError } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.user_id);
  if (countError) return fail("pushSettings.errors.saveFailed");
  if (count === 0) {
    const pref = await supabase
      .from("notification_preferences")
      .upsert({ user_id: access.user_id, push_enabled: false }, { onConflict: "user_id" });
    if (pref.error) return fail("pushSettings.errors.saveFailed");
  }
  return ok();
}

/** Whether the browser's subscription belongs to the person signed in now. */
export async function isDeviceRegistered(input: unknown): Promise<ActionResult<boolean>> {
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) return ok(false);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", access.user_id)
    .maybeSingle();
  return error ? fail("pushSettings.errors.loadFailed") : ok(!!data);
}

/** Turns the morning email on or off. */
export async function setDigestEmail(input: unknown): Promise<ActionResult> {
  const parsed = digestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: access.user_id, digest_email: parsed.data.enabled }, { onConflict: "user_id" });
  return error ? fail("pushSettings.errors.saveFailed") : ok();
}
