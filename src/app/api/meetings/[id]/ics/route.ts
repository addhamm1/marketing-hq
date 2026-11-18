import type { Access } from "@/lib/auth/access";
import { formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { meetingIcs } from "@/features/meetings/meeting-ics";
import { uuid } from "@/features/meetings/schemas";

export const dynamic = "force-dynamic";

/** The calendar file for one meeting. Row policies decide who can read the meeting. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return new Response("not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.rpc("my_access");
  const access = data as Access | null;
  if (!access || access.status !== "active") return new Response("unauthorized", { status: 401 });

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, agenda, starts_at, ends_at, location_text, online_url, status, organizer_id, created_at, updated_at, meeting_rooms(name_en, name_ar)")
    .eq("id", id)
    .maybeSingle();
  if (!meeting) return new Response("not found", { status: 404 });
  if (meeting.status === "cancelled") return new Response("cancelled", { status: 410 });

  const { data: organizer } = meeting.organizer_id
    ? await supabase.rpc("public_profiles").eq("id", meeting.organizer_id).maybeSingle()
    : { data: null };
  const me = { name: access.display_name || access.full_name, email: access.email };
  const ics = meetingIcs(meeting, organizer?.display_name ?? "Marketing HQ", me, access.locale);

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8; method=REQUEST",
      "content-disposition": `attachment; filename="meeting-${formatCairo(meeting.starts_at, "yyyy-MM-dd")}.ics"`,
      "cache-control": "private, no-store",
    },
  });
}
