"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ ids: z.array(z.uuid()).max(200).optional() }).safeParse(input);
  if (!parsed.success) return fail("validation.invalid");
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", access.user_id).is("read_at", null);
  if (parsed.data.ids) q = q.in("id", parsed.data.ids);
  const { error } = await q;
  return error ? fail("common.unknownError") : ok();
}
