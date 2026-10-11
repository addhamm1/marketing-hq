"use client";

import type { RealtimePostgresChangesFilter } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";

type Sub = { table: string; filter?: string };

/** Debounced callback on Postgres Changes (row policies apply to what arrives). */
export function useRealtimeRefresh(channel: string, subs: Sub[], onChange: () => void, delay = 250) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const key = JSON.stringify(subs);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(), delay);
    };
    let ch = supabase.channel(channel);
    for (const s of JSON.parse(key) as Sub[]) {
      const filter: RealtimePostgresChangesFilter<"*"> = { event: "*", schema: "public", table: s.table, ...(s.filter ? { filter: s.filter } : {}) };
      ch = ch.on("postgres_changes", filter, fire);
    }
    ch.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [channel, key, delay]);
}
