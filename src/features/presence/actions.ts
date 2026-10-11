"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const presenceSchema = z.enum(["available", "focus", "meeting", "shoot", "break", "away"]);

export async function setPresence(input: unknown): Promise<ActionResult> {
  const parsed = presenceSchema.safeParse(input);
  if (!parsed.success) return fail("validation.invalid");
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ presence: parsed.data, presence_updated_at: new Date().toISOString() })
    .eq("id", access.user_id);
  return error ? fail("common.unknownError") : ok();
}
