"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/browser";
import { busyIds, meetingRange, type OwnSlot } from "./time";

/** Who and which rooms are taken in the chosen period. Shows when, never what. */
export function useBusy(date: string, time: string, duration: number, userIds: string[], own: OwnSlot | null) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) && duration > 0;
  const range = valid ? meetingRange(date, time, duration) : null;

  const query = useQuery({
    queryKey: ["meeting-busy", range?.starts_at, range?.ends_at, userIds],
    enabled: !!range,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await createClient().rpc("meeting_busy", {
        p_from: range!.starts_at,
        p_to: range!.ends_at,
        p_user_ids: userIds,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = query.data;
  const rooms = useMemo(() => busyIds(rows ?? [], "room", own), [rows, own]);
  const people = useMemo(() => busyIds(rows ?? [], "user", own), [rows, own]);
  return { rooms, people, checking: query.isLoading, failed: query.isError };
}
