"use client";

import { Loader2, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setPresence } from "@/features/presence/actions";
import type { CharacterStatus } from "@/game";
import type { AvatarConfig } from "@/game/avatar/types";
import { useRouter } from "@/i18n/navigation";
import { isRtl } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/browser";
import { CharacterPopover } from "./character-popover";
import { placeCharacters } from "./place";
import { SIGN_KEYS } from "./signs";
import type { MapData, MapSelection, MapSession } from "./types";
import { useAvatarSheets } from "./use-avatar-sheets";

const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false });

const ZONE_ROUTES: Record<string, string> = {
  reception: "/checkin",
  "kanban-wall": "/boards",
  mailbox: "/approvals",
  "meeting-room": "/calendar",
  studio: "/boards",
  "trophy-shelf": "/people",
};

export function MapView({ initial, defaultSelection }: { initial: MapData; defaultSelection: MapSelection }) {
  const t = useTranslations("map");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selection, setSelection] = useState<MapSelection>(defaultSelection);
  const [sessions, setSessions] = useState<MapSession[]>(initial.sessions);
  const [presence, setPresenceMap] = useState<Record<string, CharacterStatus>>(() =>
    Object.fromEntries(initial.people.map((p) => [p.id, p.presence])),
  );
  const [avatars, setAvatars] = useState<Record<string, AvatarConfig>>(initial.avatars);
  const [zones, setZones] = useState<string[]>([]);
  const [popover, setPopover] = useState<{ userId: string; x: number; y: number } | null>(null);
  const mapKey = selection === "field" || selection === "home" ? selection : (initial.branches.find((b) => b.id === selection)?.mapKey ?? "hq");

  const people = useMemo(() => initial.people.map((p) => ({ ...p, presence: presence[p.id] ?? p.presence })), [initial.people, presence]);
  const placed = useMemo(
    () => placeCharacters({ sessions, people, desks: initial.desks, teamColors: initial.teamColors, onLeaveToday: initial.onLeaveToday }, selection, zones),
    [sessions, people, initial.desks, initial.teamColors, initial.onLeaveToday, selection, zones],
  );
  const sheets = useAvatarSheets(placed.map((p) => p.userId), avatars);
  const characters = useMemo(() => placed.map(({ checkedInAt: _c, ...c }) => ({ ...c, sheet: sheets[c.userId] })), [placed, sheets]);
  const here = placed.filter((p) => !p.onLeave).length;
  const signage = useMemo(
    () => ({
      labels: Object.fromEntries(SIGN_KEYS.map((key) => [key, t(`signs.${key}`)])),
      teamColors: initial.teamAccents,
      rtl: isRtl(locale),
    }),
    [t, initial.teamAccents, locale],
  );

  const refetchSessions = useCallback(async () => {
    const { data } = await createClient().rpc("who_is_in", {});
    if (data) setSessions(data);
  }, []);

  // Live events come from database triggers on a private branch channel (DATA_MODEL.md section 11).
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`branch:${selection}`, { config: { private: true } })
        .on("broadcast", { event: "checkin" }, () => void refetchSessions())
        .on("broadcast", { event: "checkout" }, () => void refetchSessions())
        .on("broadcast", { event: "status" }, ({ payload }) => {
          const p = payload as { user_id: string; presence: CharacterStatus };
          setPresenceMap((m) => ({ ...m, [p.user_id]: p.presence }));
        })
        .on("broadcast", { event: "avatar" }, async ({ payload }) => {
          const id = (payload as { user_id: string }).user_id;
          const { data } = await supabase.from("avatars").select("config").eq("user_id", id).maybeSingle();
          if (data) setAvatars((a) => ({ ...a, [id]: data.config as unknown as AvatarConfig }));
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [selection, refetchSessions]);

  function onZoneClick(zone: string) {
    if (zone === "cafe" || zone === "lounge") {
      startTransition(async () => {
        const r = await setPresence("break");
        if (r.ok) toast.success(t("takingBreak"));
      });
      return;
    }
    if (zone === "notice-board") {
      toast(t("announcementsSoon"));
      return;
    }
    const route = ZONE_ROUTES[zone];
    if (route) router.push(route);
  }

  const popoverPerson = popover ? people.find((p) => p.id === popover.userId) : undefined;
  const popoverPlaced = popover ? placed.find((p) => p.userId === popover.userId) : undefined;

  return (
    <div className="-mx-4 -mt-5 flex h-[calc(100dvh-3.5rem-4.5rem)] flex-col sm:-mx-6 md:h-[calc(100dvh-3.5rem)] lg:-mx-8">
      <div className="bg-background/80 flex flex-wrap items-center gap-2 border-b px-4 py-2 backdrop-blur sm:px-6">
        <h1 className="sr-only">{t("title")}</h1>
        <Select value={selection} onValueChange={(v) => { setSelection(v); setPopover(null); }}>
          <SelectTrigger size="sm" className="w-52" aria-label={t("branch")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {initial.branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectGroup>
            <SelectSeparator />
            <SelectItem value="field">{t("field")}</SelectItem>
            <SelectItem value="home">{t("home")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground ms-auto inline-flex items-center gap-1.5 text-sm">
          <Users className="size-4" aria-hidden /> {t("peopleHere", { count: here })}
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden bg-[#1b2b31]">
        <div className="text-primary-foreground/60 absolute inset-0 flex items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {t("loading")}
        </div>
        <MapCanvas
          mapKey={mapKey}
          characters={characters}
          signage={signage}
          focusId={popover?.userId ?? null}
          onZoneClick={onZoneClick}
          onCharacterClick={(userId, at) => setPopover({ userId, ...at })}
          onZones={setZones}
        />
        {popover && popoverPerson ? (
          <CharacterPopover
            person={popoverPerson}
            at={popover}
            checkedInAt={popoverPlaced?.checkedInAt || null}
            onLeave={!!popoverPlaced?.onLeave}
            card={initial.currentCards[popover.userId]}
            onClose={() => setPopover(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
