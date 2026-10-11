"use server";

import { revalidatePath } from "next/cache";
import { avatarConfigSchema } from "@/game/avatar/config";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function saveAvatar(input: unknown): Promise<ActionResult> {
  const parsed = avatarConfigSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.from("avatars").upsert({ user_id: access.user_id, config: parsed.data as never });
  if (error) return fail("common.unknownError");
  if (!access.avatar_seen) await supabase.from("profiles").update({ avatar_seen: true }).eq("id", access.user_id);
  revalidatePath("/", "layout");
  return ok();
}

export async function markAvatarSeen(): Promise<ActionResult> {
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  await supabase.from("profiles").update({ avatar_seen: true }).eq("id", access.user_id);
  return ok();
}
