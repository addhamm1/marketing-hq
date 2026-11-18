"use server";

import { revalidatePath } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { meetingFailure } from "./errors";
import { idSchema, roomSchema, seriesSchema } from "./schemas";

function refresh() {
  revalidatePath("/[locale]/meetings", "layout");
  revalidatePath("/[locale]/portal/meetings", "layout");
}

async function isManager() {
  return hasRole(await actionAccess(), "super_admin", "traffic_manager");
}

export async function saveSeries(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = seriesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const { id, cadence, weekdays, month_days, member_ids, audience, ...rest } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_meeting_series", {
    p_id: id as string,
    p: {
      ...rest,
      cadence,
      audience,
      weekdays: cadence === "weekly" ? weekdays : [],
      month_days: cadence === "monthly" ? month_days : [],
      member_ids: audience === "custom" ? member_ids : [],
    },
  });
  if (error || !data) return meetingFailure(error);
  refresh();
  return ok({ id: data });
}

export async function stopSeries(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_meeting_series", { p_id: parsed.data.id });
  if (error) return meetingFailure(error);
  refresh();
  return ok();
}

export async function saveRoom(input: unknown): Promise<ActionResult> {
  const parsed = roomSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await isManager())) return fail("common.notAllowed");
  const { id, branch_id, ...values } = parsed.data;
  const row = { ...values, branch_id: branch_id || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("meeting_rooms").update(row).eq("id", id)
    : await supabase.from("meeting_rooms").insert(row);
  if (error) return meetingFailure(error);
  refresh();
  return ok();
}
