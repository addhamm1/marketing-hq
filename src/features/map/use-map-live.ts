"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { CharacterStatus, MapInteraction, PixelGameController } from "@/game";
import type { AvatarConfig } from "@/game/avatar/types";
import { createClient } from "@/lib/supabase/browser";
import { celebrateEvent, interactEvent, moveEvent } from "./events";
import { fetchPositions } from "./map-rpc";
import type { MapData, MapPositionRow, MapSelection, MapSession } from "./types";

type Options = {
  initial: MapData;
  selection: MapSelection;
  viewerId: string;
  game: RefObject<PixelGameController | null>;
  onInteraction: (interaction: MapInteraction) => void;
};

/**
 * Everything on the floor that changes while the page is open. Events come
 * from the database on a private branch channel (DATA_MODEL.md section 11).
 */
export function useMapLive({ initial, selection, viewerId, game, onInteraction }: Options) {
  const [sessions, setSessions] = useState<MapSession[]>(initial.sessions);
  const [positions, setPositions] = useState<MapPositionRow[]>(initial.positions);
  const [presence, setPresence] = useState<Record<string, CharacterStatus>>(() =>
    Object.fromEntries(initial.people.map((p) => [p.id, p.presence])),
  );
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig>>(initial.avatars);

  const interaction = useRef(onInteraction);
  useEffect(() => {
    interaction.current = onInteraction;
  });

  const refetchSessions = useCallback(async () => {
    const { data } = await createClient().rpc("who_is_in", {});
    if (data) setSessions(data);
  }, []);

  const refetchPositions = useCallback(async () => {
    const rows = await fetchPositions();
    if (rows) setPositions(rows);
  }, []);

  // Positions change on floors this page isn't listening to; catch up when switching.
  const firstFloor = useRef(selection);
  useEffect(() => {
    if (firstFloor.current === selection) return;
    firstFloor.current = "";
    void refetchPositions();
  }, [selection, refetchPositions]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const refreshFloor = () => {
      void refetchSessions();
      void refetchPositions();
    };
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`branch:${selection}`, { config: { private: true } })
        .on("broadcast", { event: "checkin" }, refreshFloor)
        .on("broadcast", { event: "checkout" }, refreshFloor)
        .on("broadcast", { event: "status" }, ({ payload }) => {
          const p = payload as { user_id: string; presence: CharacterStatus };
          setPresence((m) => ({ ...m, [p.user_id]: p.presence }));
        })
        .on("broadcast", { event: "avatar" }, async ({ payload }) => {
          const id = (payload as { user_id: string }).user_id;
          const { data } = await supabase.from("avatars").select("config").eq("user_id", id).maybeSingle();
          if (data) setAvatars((a) => ({ ...a, [id]: data.config as unknown as AvatarConfig }));
        })
        .on("broadcast", { event: "move" }, ({ payload }) => {
          const move = moveEvent.safeParse(payload);
          // The viewer's own character is already on its way.
          if (!move.success || move.data.user_id === viewerId) return;
          const { user_id, x, y } = move.data;
          game.current?.moveCharacter(user_id, { x, y });
          setPositions((rows) => [
            ...rows.filter((r) => r.user_id !== user_id),
            { user_id, branch_id: selection, tile_x: x, tile_y: y },
          ]);
        })
        .on("broadcast", { event: "interact" }, ({ payload }) => {
          const event = interactEvent.safeParse(payload);
          if (event.success) interaction.current(event.data);
        })
        .on("broadcast", { event: "celebrate" }, ({ payload }) => {
          const event = celebrateEvent.safeParse(payload);
          if (event.success) game.current?.celebrate(event.data.user_id);
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [selection, viewerId, game, refetchSessions, refetchPositions]);

  return { sessions, positions, presence, avatars, refetchSessions };
}
