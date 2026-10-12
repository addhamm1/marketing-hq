"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { fail, invalid, ok, stageError, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { fromCairoInput } from "@/lib/dates";
import { flushEmailQueue } from "@/lib/email/queue";
import { attachDrafts } from "@/features/boards/attach-drafts";
import { createClient } from "@/lib/supabase/server";
import { resubmitSchema, strategicSchema, urgentSchema, type LineInput } from "./schemas";

function toPayload(l: LineInput & { files?: unknown }) {
  const { files: _files, ...line } = l;
  void _files;
  return {
    ...line,
    due_at: fromCairoInput(l.due_at) ?? "",
    reference_links: l.reference_links.split("\n").map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)),
  };
}

function portalError(error: { code?: string; message?: string }) {
  if (error.message?.includes("invalid_month")) return fail("portal.errors.invalid_month");
  return stageError(error);
}

export async function submitStrategicPlan(input: unknown): Promise<ActionResult<{ count: number; failedFiles: number }>> {
  const parsed = strategicSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data: planId, error } = await supabase.rpc("submit_strategic_plan", {
    payload: { for_month: parsed.data.for_month, lines: parsed.data.lines.map(toPayload) },
  });
  if (error) return portalError(error);
  let failedFiles = 0;
  if (planId && parsed.data.lines.some((l) => l.files.length)) {
    // Cards are inserted in line order with increasing positions.
    const { data: cards } = await supabase.from("cards").select("id").eq("strategic_plan_id", planId).order("position");
    for (const [i, line] of parsed.data.lines.entries()) {
      const cardId = cards?.[i]?.id;
      failedFiles += cardId ? await attachDrafts(supabase, access.user_id, cardId, line.files) : line.files.length;
    }
  }
  revalidatePath("/[locale]/portal", "page");
  return ok({ count: parsed.data.lines.length, failedFiles });
}

export async function submitUrgentRequest(input: unknown): Promise<ActionResult<{ id: string; failedFiles: number }>> {
  const parsed = urgentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { urgent_reason, files, ...line } = parsed.data;
  const { data, error } = await supabase.rpc("submit_urgent_request", { payload: { ...toPayload(line), urgent_reason } });
  if (error || !data) return portalError(error ?? {});
  const failedFiles = files.length ? await attachDrafts(supabase, access.user_id, data, files) : 0;
  revalidatePath("/[locale]/portal", "page");
  return ok({ id: data, failedFiles });
}

export async function resubmitRequest(input: unknown): Promise<ActionResult> {
  const parsed = resubmitSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { card_id, ...line } = parsed.data;
  const payload = toPayload(line);
  const { error } = await supabase.rpc("resubmit_request", {
    p_card_id: card_id,
    payload: { ...payload, brand_id: payload.brand_id || undefined },
  });
  if (error) return portalError(error);
  after(() => flushEmailQueue());
  return ok();
}
