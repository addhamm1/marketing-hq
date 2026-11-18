"use server";

import { getTranslations } from "next-intl/server";
import { type ActionResult, dbError, fail, invalid, ok } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { cairoDateString, cairoInstant } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { type KudosInput, kudosIdSchema, kudosSchema, wishSchema } from "./schemas";

export async function sendKudos(input: KudosInput): Promise<ActionResult> {
  const parsed = kudosSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  if (parsed.data.to_id === access.user_id) {
    return fail("validation.invalid", { to_id: "celebrations.errors.self" });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("kudos").insert({ ...parsed.data, from_id: access.user_id });
  return error ? fail(dbError(error)) : ok();
}

/** One tap on the birthday banner. Only on the day itself, and only once a day per person. */
export async function sendBirthdayWish(input: { to_id: string }): Promise<ActionResult> {
  const parsed = wishSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || parsed.data.to_id === access.user_id) return fail("common.notAllowed");

  const supabase = await createClient();
  const today = cairoDateString();
  const { data: days, error: daysError } = await supabase.rpc("upcoming_celebrations", { p_from: today, p_days: 0 });
  if (daysError) return fail(dbError(daysError));
  const person = days?.find((c) => c.user_id === parsed.data.to_id && c.kind === "birthday");
  if (!person) return fail("celebrations.errors.notToday");

  const { count, error: countError } = await supabase
    .from("kudos")
    .select("id", { count: "exact", head: true })
    .eq("from_id", access.user_id)
    .eq("to_id", parsed.data.to_id)
    .eq("badge", "birthday")
    .gte("created_at", cairoInstant(today).toISOString());
  if (countError) return fail(dbError(countError));
  if (count) return fail("celebrations.errors.alreadyWished");

  const t = await getTranslations("celebrations.today");
  const { error } = await supabase.from("kudos").insert({
    from_id: access.user_id,
    to_id: parsed.data.to_id,
    badge: "birthday",
    message: t("wishMessage", { name: person.display_name }),
  });
  return error ? fail(dbError(error)) : ok();
}

/** Row policies allow only the author or a super admin; anything else deletes nothing. */
export async function deleteKudos(input: { id: string }): Promise<ActionResult> {
  const parsed = kudosIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.from("kudos").delete().eq("id", parsed.data.id).select("id");
  if (error) return fail(dbError(error));
  return data.length ? ok() : fail("common.notAllowed");
}
