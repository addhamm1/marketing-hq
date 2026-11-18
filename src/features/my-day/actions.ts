"use server";

import { z } from "zod";
import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const responseSchema = z.object({
  meetingId: z.uuid(),
  response: z.enum(["accepted", "declined"]),
});

/** Accept or decline a meeting invitation from the briefing. */
export async function respondToMeeting(input: unknown): Promise<ActionResult> {
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_meeting", {
    p_id: parsed.data.meetingId,
    p_response: parsed.data.response,
  });
  return error ? fail(dbError(error)) : ok();
}
