import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderGuestInvite } from "./guest-email";
import { meetingIcs, meetingPlace } from "./meeting-ics";

type Options = { moved: boolean; locale: "en" | "ar" };

const NOTHING = { invited: 0, failed: 0 };

/**
 * Emails outside guests their invitation with the calendar file attached.
 * New guests get one once; everyone gets a fresh one when the time or room moves.
 * `invited_at` is set only after a real send, so a failed guest is retried on the
 * next save. Without RESEND_API_KEY nothing is sent. Addresses never reach the logs.
 */
export async function sendGuestInvites(client: SupabaseClient<Database>, meetingId: string, { moved, locale }: Options) {
  const [{ data: meeting }, { data: guests }] = await Promise.all([
    client
      .from("meetings")
      .select("id, title, agenda, starts_at, ends_at, location_text, online_url, status, organizer_id, created_at, updated_at, meeting_rooms(name_en, name_ar)")
      .eq("id", meetingId)
      .maybeSingle(),
    client.from("meeting_guests").select("id, name, email, invited_at").eq("meeting_id", meetingId),
  ]);
  if (!meeting || meeting.status !== "scheduled" || !guests?.length) return NOTHING;

  const admin = createAdminClient();
  if (moved) await admin.from("meeting_guests").update({ invited_at: null }).eq("meeting_id", meetingId);
  const due = moved ? guests : guests.filter((g) => !g.invited_at);
  if (!due.length) return NOTHING;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email preview] kind=meeting_guest_invite recipients=${due.length}`);
    return NOTHING;
  }

  const { data: organizer } = meeting.organizer_id
    ? await client.rpc("public_profiles").eq("id", meeting.organizer_id).maybeSingle()
    : { data: null };
  const organizerName = organizer?.display_name ?? "Espaces";
  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM ?? "Marketing HQ <marketinghq@e-spaces.co>";
  const result = { ...NOTHING };

  for (const guest of due) {
    const email = renderGuestInvite({
      locale,
      guestName: guest.name,
      organizerName,
      title: meeting.title,
      startsAt: meeting.starts_at,
      endsAt: meeting.ends_at,
      place: meetingPlace(meeting, locale),
      onlineUrl: meeting.online_url,
      agenda: meeting.agenda,
      isUpdate: moved,
    });
    const ics = meetingIcs(meeting, organizerName, { name: guest.name, email: guest.email }, locale);
    try {
      const { error } = await resend.emails.send({
        from,
        to: guest.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: [{ filename: "invite.ics", content: Buffer.from(ics, "utf8").toString("base64"), contentType: "text/calendar; charset=utf-8; method=REQUEST" }],
      });
      if (error) throw new Error("send refused");
      await admin.from("meeting_guests").update({ invited_at: new Date().toISOString() }).eq("id", guest.id);
      result.invited++;
    } catch {
      result.failed++;
    }
  }
  if (result.failed) console.warn(`[meeting invite] kind=meeting_guest_invite failed=${result.failed}`);
  return result;
}

/**
 * Tells guests who already received an invitation that the meeting is off for them,
 * with a calendar file that removes it. Used when a meeting is cancelled or a guest is removed.
 */
export async function sendGuestCancellations(
  client: SupabaseClient<Database>,
  meetingId: string,
  guests: { name: string; email: string }[],
  locale: "en" | "ar",
) {
  if (!guests.length) return 0;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email preview] kind=meeting_guest_cancel recipients=${guests.length}`);
    return 0;
  }
  const { data: meeting } = await client
    .from("meetings")
    .select("id, title, agenda, starts_at, ends_at, location_text, online_url, organizer_id, created_at, updated_at, meeting_rooms(name_en, name_ar)")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) return 0;

  const { data: organizer } = meeting.organizer_id
    ? await client.rpc("public_profiles").eq("id", meeting.organizer_id).maybeSingle()
    : { data: null };
  const organizerName = organizer?.display_name ?? "Espaces";
  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM ?? "Marketing HQ <marketinghq@e-spaces.co>";
  let sent = 0;

  for (const guest of guests) {
    const email = renderGuestInvite({
      locale,
      guestName: guest.name,
      organizerName,
      title: meeting.title,
      startsAt: meeting.starts_at,
      endsAt: meeting.ends_at,
      place: meetingPlace(meeting, locale),
      onlineUrl: meeting.online_url,
      agenda: meeting.agenda,
      isUpdate: false,
      isCancelled: true,
    });
    const ics = meetingIcs(meeting, organizerName, guest, locale, "CANCEL");
    try {
      const { error } = await resend.emails.send({
        from,
        to: guest.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: [{ filename: "cancel.ics", content: Buffer.from(ics, "utf8").toString("base64"), contentType: "text/calendar; charset=utf-8; method=CANCEL" }],
      });
      if (error) throw new Error("send refused");
      sent++;
    } catch {
      console.warn("[meeting invite] kind=meeting_guest_cancel failed=1");
    }
  }
  return sent;
}
