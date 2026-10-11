"use server";

import { randomUUID } from "node:crypto";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  addItemSchema, commentSchema, createChecklistSchema, editCommentSchema, idSchema, linkSchema,
  registerAttachmentSchema, toggleItemSchema, uploadUrlSchema,
} from "./schemas";

const BUCKET = "card-attachments";

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

function safeName(name: string) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  return `${randomUUID()}${ext.slice(0, 10)}`;
}

/** Signed upload URL into cards/<card_id>/ (storage policies check the card). */
export async function createAttachmentUpload(input: unknown): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = uploadUrlSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data: canView } = await c.supabase.rpc("can_view_card", { p_card_id: parsed.data.card_id });
  if (!canView) return fail("common.notAllowed");
  const path = `cards/${parsed.data.card_id}/${safeName(parsed.data.file_name)}`;
  const { data, error } = await c.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail("card.uploadFailed");
  return ok({ path: data.path, token: data.token });
}

export async function registerAttachment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = registerAttachmentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  if (!parsed.data.path.startsWith(`cards/${parsed.data.card_id}/`)) return fail("common.notAllowed");
  const { data, error } = await c.supabase
    .from("attachments")
    .insert({
      card_id: parsed.data.card_id,
      uploaded_by: c.access.user_id,
      kind: "file",
      storage_path: parsed.data.path,
      name: parsed.data.name,
      mime: parsed.data.mime,
      size: parsed.data.size,
    })
    .select("id")
    .single();
  return error || !data ? fail("common.notAllowed") : ok({ id: data.id });
}

export async function addLinkAttachment(input: unknown): Promise<ActionResult> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { error } = await c.supabase.from("attachments").insert({
    card_id: parsed.data.card_id,
    uploaded_by: c.access.user_id,
    kind: "link",
    url: parsed.data.url,
    name: parsed.data.name,
  });
  return error ? fail("common.notAllowed") : ok();
}

export async function deleteAttachment(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("attachments").delete().eq("id", parsed.data.id).select("storage_path");
  if (!data?.length) return fail("common.notAllowed");
  if (data[0].storage_path) await c.supabase.storage.from(BUCKET).remove([data[0].storage_path]);
  return ok();
}

/** Short-lived signed URL for viewing a file attachment. */
export async function attachmentUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data: att } = await c.supabase.from("attachments").select("storage_path, url, kind").eq("id", parsed.data.id).single();
  if (!att) return fail("common.notAllowed");
  if (att.kind === "link" && att.url) return ok({ url: att.url });
  const { data, error } = await c.supabase.storage.from(BUCKET).createSignedUrl(att.storage_path!, 60 * 10);
  return error || !data ? fail("common.notAllowed") : ok({ url: data.signedUrl });
}
