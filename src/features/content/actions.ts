"use server";

import { after } from "next/server";
import { z } from "zod";
import { fail, invalid, ok, stageError, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { flushEmailQueue } from "@/lib/email/queue";
import { createClient } from "@/lib/supabase/server";
import { FORMATS, PILLARS, POST_PLATFORMS } from "./types";

const id = z.uuid();
const iso = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "validation.invalid");

const postFields = z.object({
  brand_id: id,
  branch_id: id.nullable(),
  platforms: z.array(z.enum(POST_PLATFORMS)).max(5),
  scheduled_at: iso.nullable(),
  format: z.enum(FORMATS as [string, ...string[]]),
  caption_ar: z.string().max(5000, "validation.tooLong"),
  caption_en: z.string().max(5000, "validation.tooLong"),
  hashtags: z.array(z.string().trim().regex(/^[\p{L}\p{N}_]+$/u, "validation.invalid").max(80)).max(30),
  first_comment: z.string().max(2000, "validation.tooLong"),
  pillar: z.enum(PILLARS as [string, ...string[]]).nullable(),
  notes: z.string().max(2000, "validation.tooLong"),
  publisher_id: id.nullable(),
});

async function client() {
  const access = await actionAccess();
  return access && access.is_marketing ? { access, supabase: await createClient() } : null;
}

export async function createPost(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = postFields.partial().extend({ brand_id: id }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase
    .from("posts")
    .insert({ ...parsed.data, owner_id: c.access.user_id, status: "draft" } as never)
    .select("id")
    .single();
  return error || !data ? fail("common.notAllowed") : ok({ id: (data as { id: string }).id });
}

export async function updatePost(input: unknown): Promise<ActionResult> {
  const parsed = postFields.partial().extend({ id }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { id: postId, ...patch } = parsed.data;
  const { data, error } = await c.supabase.from("posts").update(patch as never).eq("id", postId).select("id");
  return error || !data?.length ? fail("common.notAllowed") : ok();
}

/** Drag to another day keeps the time; the client sends the new instant. */
export async function reschedulePost(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, scheduled_at: iso }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("posts").update({ scheduled_at: parsed.data.scheduled_at }).eq("id", parsed.data.id).select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function deletePost(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data: media } = await c.supabase.from("post_media").select("storage_path, thumbnail_path, attachment_id").eq("post_id", parsed.data.id);
  const { data } = await c.supabase.from("posts").delete().eq("id", parsed.data.id).select("id");
  if (!data?.length) return fail("common.notAllowed");
  const paths = (media ?? []).flatMap((m) => [m.attachment_id ? null : m.storage_path, m.thumbnail_path]).filter(Boolean) as string[];
  if (paths.length) await c.supabase.storage.from("post-media").remove(paths);
  return ok();
}

export async function submitPost(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { error } = await c.supabase.rpc("submit_post", { p_post_id: parsed.data.id });
  return error ? stageError(error) : ok();
}

export async function decidePost(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, approve: z.boolean(), comment: z.string().trim().max(2000).optional() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  if (!parsed.data.approve && !parsed.data.comment) return fail("stageActions.commentRequired");
  const { error } = await c.supabase.rpc("decide_post", { p_post_id: parsed.data.id, p_approve: parsed.data.approve, p_comment: parsed.data.comment });
  return error ? stageError(error) : ok();
}

export async function createPostFromCard(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ card_id: id, scheduled_at: iso }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase.rpc("create_post_from_card", { p_card_id: parsed.data.card_id, p_scheduled_at: parsed.data.scheduled_at });
  return error || !data ? stageError(error) : ok({ id: data });
}

export async function markPublished(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, links: z.partialRecord(z.enum(POST_PLATFORMS), z.url().max(2000)).default({}) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { error } = await c.supabase.rpc("mark_post_published", { p_post_id: parsed.data.id, p_links: parsed.data.links });
  if (error) return stageError(error);
  after(() => flushEmailQueue());
  return ok();
}

const mediaSchema = z.object({
  post_id: id,
  storage_path: z.string().min(1).max(500),
  thumbnail_path: z.string().max(500).nullable(),
  media_type: z.enum(["image", "video"]),
  width: z.number().int().positive().max(20000).nullable(),
  height: z.number().int().positive().max(20000).nullable(),
  duration_seconds: z.number().nonnegative().max(36000).nullable(),
  position: z.string().regex(/^[0-9A-Za-z]+$/).max(64),
});

export async function addPostMedia(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  if (!parsed.data.storage_path.startsWith(`posts/${parsed.data.post_id}/`)) return fail("common.notAllowed");
  const { data, error } = await c.supabase.from("post_media").insert(parsed.data).select("id").single();
  return error || !data ? fail("common.notAllowed") : ok({ id: data.id });
}

export async function removePostMedia(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("post_media").delete().eq("id", parsed.data.id).select("storage_path, thumbnail_path, attachment_id");
  if (!data?.length) return fail("common.notAllowed");
  const paths = [data[0].attachment_id ? null : data[0].storage_path, data[0].thumbnail_path].filter(Boolean) as string[];
  if (paths.length) await c.supabase.storage.from("post-media").remove(paths);
  return ok();
}

export async function movePostMedia(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, position: z.string().regex(/^[0-9A-Za-z]+$/).max(64) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase.from("post_media").update({ position: parsed.data.position }).eq("id", parsed.data.id).select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

/** Signed upload for thumbnails and small files (large videos use resumable uploads from the browser). */
export async function postMediaUploadUrl(input: unknown): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = z.object({ post_id: id, name: z.string().regex(/^[0-9a-zA-Z._-]{1,120}$/) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase.storage.from("post-media").createSignedUploadUrl(`posts/${parsed.data.post_id}/${parsed.data.name}`);
  return error || !data ? fail("card.uploadFailed") : ok({ path: data.path, token: data.token });
}
