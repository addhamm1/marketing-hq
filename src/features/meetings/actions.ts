"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import type { Access } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { meetingFailure } from "./errors";
import { sendGuestInvites } from "./guest-invites";
import { idSchema, meetingSchema, notesSchema, respondSchema } from "./schemas";
import { meetingRange } from "./time";
import type { SaveMeetingResult } from "./types";

function refresh() {
  revalidatePath("/[locale]/meetings", "layout");
  revalidatePath("/[locale]/portal/meetings", "layout");
}

/** Other departments follow fixed meetings but do not change them. */
async function isFixedForPortal(client: SupabaseClient<Database>, access: Access, id: string) {
  if (access.is_team_app) return false;
  const { data } = await client.from("meetings").select("series_id").eq("id", id).maybeSingle();
  return !!data?.series_id;
}

export async function saveMeeting(input: unknown): Promise<ActionResult<SaveMeetingResult>> {
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const d = parsed.data;
  const supabase = await createClient();
  const range = meetingRange(d.date, d.time, d.duration);
  const roomId = d.room_id || null;

  let moved = false;
  if (d.id) {
    const { data: before } = await supabase.from("meetings").select("starts_at, ends_at, room_id, status, series_id").eq("id", d.id).maybeSingle();
    if (!before) return fail("meetings.errors.not_found");
    if (before.status !== "scheduled") return fail("meetings.errors.closed");
    if (before.series_id && !access.is_team_app) return fail("common.notAllowed");
    moved =
      Date.parse(before.starts_at) !== Date.parse(range.starts_at) ||
      Date.parse(before.ends_at) !== Date.parse(range.ends_at) ||
      before.room_id !== roomId;
  }

  const { data: id, error } = await supabase.rpc("save_meeting", {
    p_id: d.id as string,
    p: {
      title: d.title,
      agenda: d.agenda,
      ...range,
      room_id: roomId,
      location_text: d.location_text || null,
      online_url: d.online_url || null,
      is_private: d.is_private,
      attendee_ids: d.attendee_ids,
      guests: d.guests,
    },
  });
  if (error || !id) return meetingFailure(error);

  const invites = await sendGuestInvites(supabase, id, { moved, locale: access.locale });
  refresh();
  return ok({ id, ...invites });
}

export async function respondToMeeting(input: unknown): Promise<ActionResult> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_meeting", { p_id: parsed.data.id, p_response: parsed.data.response });
  if (error) return meetingFailure(error);
  refresh();
  return ok();
}

export async function cancelMeeting(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  if (await isFixedForPortal(supabase, access, parsed.data.id)) return fail("common.notAllowed");
  const { error } = await supabase.rpc("cancel_meeting", { p_id: parsed.data.id });
  if (error) return meetingFailure(error);
  refresh();
  return ok();
}

/** Autosave: no page refresh, the editor keeps its own state. */
export async function saveMeetingNotes(input: unknown): Promise<ActionResult> {
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_meeting_notes", { p_id: parsed.data.id, p_notes: parsed.data.notes });
  return error ? meetingFailure(error) : ok();
}
