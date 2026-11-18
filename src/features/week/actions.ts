"use server";

import { revalidatePath } from "next/cache";
import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { addDaysTo, weekStartOf } from "./days";
import { canPlanFor, copyPlanRows, isPlannableDay } from "./plan-rules";
import { clearPlanSchema, copyWeekSchema, planEntrySchema } from "./schemas";

function refreshBoards() {
  revalidatePath("/[locale]/week", "page");
  revalidatePath("/[locale]/portal/week", "page");
}

export async function savePlanEntry(input: unknown): Promise<ActionResult> {
  const parsed = planEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user_id, day, kind, branch_id, place } = parsed.data;
  const access = await actionAccess();
  if (!access || !canPlanFor(access, user_id)) return fail("common.notAllowed");
  if (!isPlannableDay(day, cairoDateString())) return fail("week.errors.pastDay");

  const supabase = await createClient();
  if (kind === "branch") {
    const { data: branch } = await supabase.from("branches").select("id").eq("id", branch_id).eq("is_active", true).maybeSingle();
    if (!branch) return fail("validation.invalid", { branch_id: "validation.uuid" });
  }
  const { error } = await supabase.from("week_plan_entries").upsert(
    {
      user_id,
      day,
      kind,
      branch_id: kind === "branch" ? branch_id : null,
      place: kind === "field" ? place : null,
    },
    { onConflict: "user_id,day" },
  );
  if (error) return fail(dbError(error));
  refreshBoards();
  return ok();
}

/** Back to the default: the person's schedule and usual branch. */
export async function clearPlanEntry(input: unknown): Promise<ActionResult> {
  const parsed = clearPlanSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user_id, day } = parsed.data;
  const access = await actionAccess();
  if (!access || !canPlanFor(access, user_id)) return fail("common.notAllowed");
  if (!isPlannableDay(day, cairoDateString())) return fail("week.errors.pastDay");

  const supabase = await createClient();
  const { error } = await supabase.from("week_plan_entries").delete().eq("user_id", user_id).eq("day", day);
  if (error) return fail(dbError(error));
  refreshBoards();
  return ok();
}

/** Copies the caller's own plan from the week before into the week shown. */
export async function copyLastWeek(input: unknown): Promise<ActionResult<{ copied: number }>> {
  const parsed = copyWeekSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !canPlanFor(access, access.user_id)) return fail("common.notAllowed");

  const week = weekStartOf(parsed.data.week);
  const supabase = await createClient();
  const [lastWeek, thisWeek, branches] = await Promise.all([
    supabase
      .from("week_plan_entries")
      .select("day, kind, branch_id, place")
      .eq("user_id", access.user_id)
      .gte("day", addDaysTo(week, -7))
      .lte("day", addDaysTo(week, -2)),
    supabase.from("week_plan_entries").select("day").eq("user_id", access.user_id).gte("day", week).lte("day", addDaysTo(week, 5)),
    supabase.from("branches").select("id").eq("is_active", true),
  ]);
  const failed = lastWeek.error ?? thisWeek.error ?? branches.error;
  if (failed) return fail(dbError(failed));

  const rows = copyPlanRows(lastWeek.data ?? [], {
    week,
    today: cairoDateString(),
    plannedDays: new Set((thisWeek.data ?? []).map((e) => e.day)),
    activeBranchIds: new Set((branches.data ?? []).map((b) => b.id)),
  });
  if (rows.length) {
    const { error } = await supabase
      .from("week_plan_entries")
      .upsert(rows.map((r) => ({ ...r, user_id: access.user_id })), { onConflict: "user_id,day", ignoreDuplicates: true });
    if (error) return fail(dbError(error));
    refreshBoards();
  }
  return ok({ copied: rows.length });
}
