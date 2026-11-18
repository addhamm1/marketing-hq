"use server";

import { revalidatePath } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { meetingFailure } from "./errors";
import { actionItemPatchSchema, actionItemSchema, idSchema } from "./schemas";

function refresh() {
  revalidatePath("/[locale]/meetings/[id]", "page");
  revalidatePath("/[locale]/portal/meetings/[id]", "page");
}

export async function addActionItem(input: unknown): Promise<ActionResult> {
  const parsed = actionItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { meeting_id, title, assignee_id, due_on } = parsed.data;
  const { error } = await supabase.from("meeting_actions").insert({
    meeting_id,
    title,
    assignee_id: assignee_id || null,
    due_on: due_on || null,
  });
  if (error) return meetingFailure(error);
  refresh();
  return ok();
}

export async function updateActionItem(input: unknown): Promise<ActionResult> {
  const parsed = actionItemPatchSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { assignee_id, due_on, ...rest } = parsed.data.patch;
  const { data, error } = await supabase
    .from("meeting_actions")
    .update({
      ...rest,
      ...(assignee_id !== undefined ? { assignee_id: assignee_id || null } : {}),
      ...(due_on !== undefined ? { due_on: due_on || null } : {}),
    })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return meetingFailure(error);
  // Row policies hide a refused update: no error, no row.
  if (!data?.length) return fail("common.notAllowed");
  refresh();
  return ok();
}

export async function deleteActionItem(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.from("meeting_actions").delete().eq("id", parsed.data.id).select("id");
  if (error) return meetingFailure(error);
  if (!data?.length) return fail("common.notAllowed");
  refresh();
  return ok();
}

export async function makeActionCard(input: unknown): Promise<ActionResult<{ cardId: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("meeting_action_to_card", { p_action_id: parsed.data.id });
  if (error || !data) return meetingFailure(error);
  refresh();
  return ok({ cardId: data });
}
