"use server";

import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cardPath, draftPath, ownDraftName, storageName } from "@/lib/uploads/paths";
import { BRIEF_MEDIA_RULE, validateFile } from "@/lib/uploads/rules";
import {
  attachmentUrlSchema, cardIdSchema, draftPathSchema, fileMetaSchema, idSchema, linkSchema,
  registerAttachmentSchema, uploadUrlSchema,
} from "./schemas";

const BUCKET = "card-attachments";
const URL_TTL = 60 * 10;

async function client() {
  const access = await actionAccess();
  return access ? { access, supabase: await createClient() } : null;
}

/** Same rules as the browser, re-checked here: type and the bucket's size limit. */
function checkFile(meta: { file_name: string; mime: string; size: number }) {
  const error = validateFile({ name: meta.file_name, type: meta.mime, size: meta.size }, BRIEF_MEDIA_RULE);
  return error ? fail(`media.errors.${error.key}`, undefined, error.params) : null;
}

/** Signed upload URL into cards/<card_id>/ (storage policies check the card). Big files use TUS on the same path. */
export async function createAttachmentUpload(input: unknown): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = uploadUrlSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bad = checkFile(parsed.data);
  if (bad) return bad;
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data: canView } = await c.supabase.rpc("can_view_card", { p_card_id: parsed.data.card_id });
  if (!canView) return fail("common.notAllowed");
  const path = cardPath(parsed.data.card_id, storageName(parsed.data.file_name));
  const { data, error } = await c.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail("card.uploadFailed");
  return ok({ path: data.path, token: data.token });
}

/** Signed upload URL into drafts/<me>/ for a request that has no card yet. */
export async function createDraftUpload(input: unknown): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = fileMetaSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bad = checkFile(parsed.data);
  if (bad) return bad;
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const path = draftPath(c.access.user_id, storageName(parsed.data.file_name));
  const { data, error } = await c.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail("card.uploadFailed");
  return ok({ path: data.path, token: data.token });
}

/** Removes one of my drafts (file removed from the form before submitting). */
export async function discardDraft(input: unknown): Promise<ActionResult> {
  const parsed = draftPathSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  if (!ownDraftName(parsed.data.path, c.access.user_id)) return fail("common.notAllowed");
  await c.supabase.storage.from(BUCKET).remove([parsed.data.path]);
  return ok();
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
  if (!/^https?:\/\//i.test(parsed.data.url)) return fail("validation.invalid");
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

/** Short-lived signed URL for viewing (or downloading) a file attachment. */
export async function attachmentUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = attachmentUrlSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data: att } = await c.supabase.from("attachments").select("storage_path, url, kind, name").eq("id", parsed.data.id).single();
  if (!att) return fail("common.notAllowed");
  if (att.kind === "link" && att.url) return ok({ url: att.url });
  const { data, error } = await c.supabase.storage
    .from(BUCKET)
    .createSignedUrl(att.storage_path!, URL_TTL, parsed.data.download ? { download: att.name } : undefined);
  return error || !data ? fail("common.notAllowed") : ok({ url: data.signedUrl });
}

/** Signed view URLs for every file on a card, in one round trip (gallery thumbnails). */
export async function attachmentUrls(input: unknown): Promise<ActionResult<Record<string, string>>> {
  const parsed = cardIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data: rows } = await c.supabase
    .from("attachments")
    .select("id, storage_path")
    .eq("card_id", parsed.data.card_id)
    .eq("kind", "file");
  const files = (rows ?? []).filter((r): r is { id: string; storage_path: string } => !!r.storage_path);
  if (!files.length) return ok({});
  const { data, error } = await c.supabase.storage.from(BUCKET).createSignedUrls(files.map((f) => f.storage_path), URL_TTL);
  if (error || !data) return fail("common.notAllowed");
  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return ok(Object.fromEntries(files.flatMap((f) => (byPath.get(f.storage_path) ? [[f.id, byPath.get(f.storage_path)!]] : []))));
}
