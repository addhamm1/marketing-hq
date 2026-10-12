"use server";

import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  addItemSchema, commentSchema, createChecklistSchema, editCommentSchema, idSchema, toggleItemSchema,
} from "./schemas";

async function client() {
  const access = await actionAccess();
  return access ? { access, supabase: await createClient() } : null;
}

export async function createChecklist(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createChecklistSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase.from("checklists").insert(parsed.data).select("id").single();
  return error || !data ? fail("common.notAllowed") : ok({ id: data.id });
}

export async function deleteChecklist(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("checklists").delete().eq("id", parsed.data.id).select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function addChecklistItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = addItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase.from("checklist_items").insert(parsed.data).select("id").single();
  return error || !data ? fail("common.notAllowed") : ok({ id: data.id });
}

export async function toggleChecklistItem(input: unknown): Promise<ActionResult> {
  const parsed = toggleItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("checklist_items").update({ done: parsed.data.done }).eq("id", parsed.data.id).select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function deleteChecklistItem(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("checklist_items").delete().eq("id", parsed.data.id).select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function addComment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase
    .from("comments")
    .insert({ ...parsed.data, author_id: c.access.user_id })
    .select("id")
    .single();
  return error || !data ? fail("common.notAllowed") : ok({ id: data.id });
}

export async function editComment(input: unknown): Promise<ActionResult> {
  const parsed = editCommentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { id, ...patch } = parsed.data;
  const { data } = await c.supabase
    .from("comments")
    .update({ ...patch, edited_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function deleteComment(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("comments").delete().eq("id", parsed.data.id).select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}
