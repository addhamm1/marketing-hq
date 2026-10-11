"use server";

import { after } from "next/server";
import { fail, invalid, ok, stageError, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { flushEmailQueue } from "@/lib/email/queue";
import { createClient } from "@/lib/supabase/server";
import {
  assigneesSchema, cardLabelsSchema, createCardSchema, createLabelSchema, decideSchema, idSchema,
  moveCardSchema, moveStageSchema, reviewersSchema, updateCardSchema,
} from "./schemas";

async function client() {
  const access = await actionAccess();
  return access ? { access, supabase: await createClient() } : null;
}

export async function createCard(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data: board } = await c.supabase.from("boards").select("is_pipeline").eq("id", parsed.data.board_id).single();
  if (board?.is_pipeline) {
    // Pipeline quick-add: Traffic only, creates an internal card in intake.
    const { data, error } = await c.supabase.rpc("create_internal_card", {
      p_title: parsed.data.title,
      p_position: parsed.data.position,
    });
    return error || !data ? fail("common.notAllowed") : ok({ id: data });
  }
  const { data, error } = await c.supabase
    .from("cards")
    .insert({ ...parsed.data, created_by: c.access.user_id })
    .select("id")
    .single();
  return error || !data ? fail("common.notAllowed") : ok({ id: data.id });
}

/** Reorder within a list, or move between lists on free-form boards. */
export async function moveCard(input: unknown): Promise<ActionResult> {
  const parsed = moveCardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase
    .from("cards")
    .update({ list_id: parsed.data.list_id, position: parsed.data.position })
    .eq("id", parsed.data.id)
    .select("id");
  if (error || !data?.length) return fail("boards.moveRefused");
  return ok();
}

export async function moveCardStage(input: unknown): Promise<ActionResult> {
  const parsed = moveStageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { error } = await c.supabase.rpc("move_card_stage", {
    p_card_id: parsed.data.id,
    p_to: parsed.data.to as never,
    p_payload: parsed.data.payload,
  });
  if (error) return stageError(error);
  after(() => flushEmailQueue());
  if (parsed.data.position) {
    await c.supabase.from("cards").update({ position: parsed.data.position }).eq("id", parsed.data.id);
  }
  return ok();
}

export async function updateCard(input: unknown): Promise<ActionResult> {
  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { id, ...patch } = parsed.data;
  const { data, error } = await c.supabase.from("cards").update(patch as never).eq("id", id).select("id");
  if (error || !data?.length) return fail("common.notAllowed");
  return ok();
}

export async function archiveCard(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase
    .from("cards")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function setAssignees(input: unknown): Promise<ActionResult> {
  const parsed = assigneesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { card_id, assignees } = parsed.data;
  const { data: current, error } = await c.supabase.from("card_assignees").select("id, user_id, role").eq("card_id", card_id);
  if (error) return fail("common.notAllowed");
  const key = (a: { user_id: string; role: string }) => `${a.user_id}:${a.role}`;
  const wanted = new Set(assignees.map(key));
  const have = new Set((current ?? []).map(key));
  const remove = (current ?? []).filter((a) => !wanted.has(key(a))).map((a) => a.id);
  const add = assignees.filter((a) => !have.has(key(a))).map((a) => ({ card_id, user_id: a.user_id, role: a.role as never }));
  if (remove.length) {
    const r = await c.supabase.from("card_assignees").delete().in("id", remove).select("id");
    if (r.error || r.data?.length !== remove.length) return fail("common.notAllowed");
  }
  if (add.length) {
    const a = await c.supabase.from("card_assignees").insert(add);
    if (a.error) return fail("common.notAllowed");
  }
  return ok();
}

export async function setCardLabels(input: unknown): Promise<ActionResult> {
  const parsed = cardLabelsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { card_id, label_ids } = parsed.data;
  const { data: current } = await c.supabase.from("card_labels").select("id, label_id").eq("card_id", card_id);
  const remove = (current ?? []).filter((l) => !label_ids.includes(l.label_id)).map((l) => l.id);
  const add = label_ids.filter((l) => !(current ?? []).some((x) => x.label_id === l)).map((label_id) => ({ card_id, label_id }));
  if (remove.length && (await c.supabase.from("card_labels").delete().in("id", remove)).error) return fail("common.notAllowed");
  if (add.length && (await c.supabase.from("card_labels").insert(add)).error) return fail("common.notAllowed");
  return ok();
}

export async function createLabel(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createLabelSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase.from("labels").insert(parsed.data).select("id").single();
  return error || !data ? fail("common.notAllowed") : ok({ id: data.id });
}

export async function setReviewers(input: unknown): Promise<ActionResult> {
  const parsed = reviewersSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { error } = await c.supabase.rpc("set_card_reviewers", {
    p_card_id: parsed.data.card_id,
    p_reviewer: parsed.data.reviewer_id as string,
    p_approver: parsed.data.approver_id as string,
  });
  return error ? fail("common.notAllowed") : ok();
}

/** Approve, reject or request changes on an approval step (cards and requests). */
export async function decideStep(input: unknown): Promise<ActionResult> {
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { decision, comment, reason } = parsed.data;
  if (decision !== "approved" && !comment) {
    return fail("stageActions.commentRequired", { comment: "stageActions.commentRequired" });
  }
  const { error } = await c.supabase.rpc("decide_step", {
    p_step_id: parsed.data.step_id,
    p_decision: decision,
    p_comment: comment ?? undefined,
    p_reason: (reason as never) ?? undefined,
  });
  if (error) return stageError(error);
  after(() => flushEmailQueue());
  return ok();
}
