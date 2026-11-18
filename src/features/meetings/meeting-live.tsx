"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

/** Keeps an open meeting current: answers, actions, and a change of time, room or status. */
export function MeetingLive({ id, signature }: { id: string; signature: string }) {
  const router = useRouter();

  useRealtimeRefresh(
    `meeting-people-${id}`,
    [
      { table: "meeting_attendees", filter: `meeting_id=eq.${id}` },
      { table: "meeting_actions", filter: `meeting_id=eq.${id}` },
    ],
    () => router.refresh(),
    400,
  );

  // Notes autosave touches this row constantly, so refresh only when something shown here changed.
  useRealtimeRefresh(`meeting-row-${id}`, [{ table: "meetings", filter: `id=eq.${id}` }], async () => {
    const { data } = await createClient().from("meetings").select("status, starts_at, ends_at, room_id, title").eq("id", id).maybeSingle();
    if (data && [data.status, data.starts_at, data.ends_at, data.room_id, data.title].join("|") !== signature) router.refresh();
  }, 400);

  return null;
}
