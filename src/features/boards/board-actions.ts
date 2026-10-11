"use server";

import { revalidatePath } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  boardMemberSchema, createBoardSchema, createListSchema, idSchema, updateBoardSchema, updateListSchema,
} from "./schemas";

async function client() {
  const access = await actionAccess();
  return access ? { access, supabase: await createClient() } : null;
}

export async function createBoard(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createBoardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase
    .from("boards")
    .insert({ ...parsed.data, created_by: c.access.user_id })
    .select("id")
    .single();
  if (error || !data) return fail(error?.code === "42501" ? "common.notAllowed" : "common.unknownError");
  // Starter lists so a new board is usable right away.
  await c.supabase.from("lists").insert([
    { board_id: data.id, name: "To do", position: "a0" },
    { board_id: data.id, name: "Doing", position: "a1" },
    { board_id: data.id, name: "Done", position: "a2" },
  ]);
  revalidatePath("/[locale]/boards", "page");
  return ok({ id: data.id });
}

export async function updateBoard(input: unknown): Promise<ActionResult> {
  const parsed = updateBoardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { id, ...patch } = parsed.data;
  const { data, error } = await c.supabase.from("boards").update(patch).eq("id", id).select("id");
  if (error || !data?.length) return fail("common.notAllowed");
  revalidatePath("/[locale]/boards", "page");
  return ok();
}

export async function archiveBoard(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase
    .from("boards")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("is_pipeline", false)
    .select("id");
  if (!data?.length) return fail("common.notAllowed");
  revalidatePath("/[locale]/boards", "page");
  return ok();
}

export async function addBoardMember(input: unknown): Promise<ActionResult> {
  const parsed = boardMemberSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { error } = await c.supabase.from("board_members").insert(parsed.data);
  if (error && error.code !== "23505") return fail("common.notAllowed");
  return ok();
}

export async function removeBoardMember(input: unknown): Promise<ActionResult> {
  const parsed = boardMemberSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase
    .from("board_members")
    .delete()
    .eq("board_id", parsed.data.board_id)
    .eq("user_id", parsed.data.user_id)
    .select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function createList(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createListSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data, error } = await c.supabase.from("lists").insert(parsed.data).select("id").single();
  if (error || !data) return fail("common.notAllowed");
  return ok({ id: data.id });
}

export async function updateList(input: unknown): Promise<ActionResult> {
  const parsed = updateListSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { id, ...patch } = parsed.data;
  const { data } = await c.supabase.from("lists").update(patch).eq("id", id).is("stage", null).select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}

export async function archiveList(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const c = await client();
  if (!c) return fail("common.notAllowed");
  const { data } = await c.supabase
    .from("lists")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .is("stage", null)
    .select("id");
  return data?.length ? ok() : fail("common.notAllowed");
}
