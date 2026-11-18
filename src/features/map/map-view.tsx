"use client";

import { Loader2, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setPresence } from "@/features/presence/actions";
import type { MapInteraction, MapInteractionKind, MapTile, PixelGameController } from "@/game";
import { useRouter } from "@/i18n/navigation";
import { isRtl } from "@/i18n/routing";
import { CharacterPopover } from "./character-popover";
import { bothOnFloor, floorOf, isBranchFloor } from "./floor";
import { MapHint } from "./map-hint";
import { sendInteraction, sendMove } from "./map-rpc";
import { MoveSync } from "./move-sync";
import { placeCharacters } from "./place";
import { SIGN_KEYS } from "./signs";
import type { MapData, MapSelection } from "./types";
import { useAvatarSheets } from "./use-avatar-sheets";
import { useMapLive } from "./use-map-live";

const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false });

const ZONE_ROUTES: Record<string, string> = {
  reception: "/checkin",
  "kanban-wall": "/boards",
  mailbox: "/approvals",
  "meeting-room": "/meetings",
  "notice-board": "/celebrations",
  studio: "/boards",
  "trophy-shelf": "/people",
};

export function MapView({ initial, defaultSelection, viewerId, canAct }: {
  initial: MapData;
  defaultSelection: MapSelection;
  viewerId: string;
  /** Marketing staff can move and interact; other viewers only watch. */
  canAct: boolean;
}) {
  const t = useTranslations("map");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selection, setSelection] = useState<MapSelection>(defaultSelection);
  const [zones, setZones] = useState<string[]>([]);
  const [popover, setPopover] = useState<{ userId: string; x: number; y: number } | null>(null);
  const [hint, setHint] = useState(0);
  const game = useRef<PixelGameController | null>(null);
  const mapKey = selection === "field" || selection === "home" ? selection : (initial.branches.find((b) => b.id === selection)?.mapKey ?? "hq");

  const nameOf = (id: string) => initial.people.find((p) => p.id === id)?.name ?? "";

  function onInteraction(event: MapInteraction) {
    game.current?.playInteraction(event);
    if (event.to !== viewerId || event.from === viewerId) return;
    if (event.kind === "dance" || event.kind === "clap") return;
    toast(t(`interact.received.${event.kind}`, { name: nameOf(event.from) }));
  }

  const { sessions, positions, presence, avatars, refetchSessions } = useMapLive({ initial, selection, viewerId, game, onInteraction });

  const people = useMemo(() => initial.people.map((p) => ({ ...p, presence: presence[p.id] ?? p.presence })), [initial.people, presence]);
  const placed = useMemo(
    () => placeCharacters({ sessions, people, desks: initial.desks, teamColors: initial.teamColors, onLeaveToday: initial.onLeaveToday }, selection, zones),
    [sessions, people, initial.desks, initial.teamColors, initial.onLeaveToday, selection, zones],
  );
  const sheets = useAvatarSheets(placed.map((p) => p.userId), avatars);
  const characters = useMemo(() => placed.map(({ checkedInAt: _c, ...c }) => ({ ...c, sheet: sheets[c.userId] })), [placed, sheets]);
  const floorPositions = useMemo(
    () => positions.filter((p) => p.branch_id === selection).map((p) => ({ userId: p.user_id, x: p.tile_x, y: p.tile_y })),
    [positions, selection],
  );
  const here = placed.filter((p) => !p.onLeave).length;
  const signage = useMemo(
    () => ({
      labels: Object.fromEntries(SIGN_KEYS.map((key) => [key, t(`signs.${key}`)])),
      teamColors: initial.teamAccents,
      rtl: isRtl(locale),
    }),
    [t, initial.teamAccents, locale],
  );

  const checkedInHere = floorOf(sessions.find((s) => s.user_id === viewerId)) === selection;
  const playerId = canAct && checkedInHere && isBranchFloor(selection) ? viewerId : null;

  // Positions go out at a pace the server accepts, for as long as the viewer walks this floor.
  const moves = useRef<MoveSync | null>(null);
  useEffect(() => {
    if (!playerId) return;
    const sync = new MoveSync(async (tile) => {
      const result = await sendMove(selection, tile);
      if (result !== "not_checked_in") return result;
      toast.info(t("interact.errors.not_checked_in"));
      void refetchSessions();
      return "failed";
    });
    moves.current = sync;
    return () => {
      sync.dispose();
      moves.current = null;
    };
  }, [playerId, selection, t, refetchSessions]);

  const onPlayerMove = useCallback((tile: MapTile, arrived: boolean) => {
    if (!arrived) setPopover(null);
    moves.current?.push(tile);
  }, []);
  const dismissHint = useCallback(() => setHint(0), []);

  function onFloorTap() {
    if (canAct && isBranchFloor(selection)) setHint((n) => n + 1);
  }

  async function act(userId: string, kind: MapInteractionKind) {
    setPopover(null); // lets go of the character so it can join in
    const self = userId === viewerId;
    const name = nameOf(userId);
    const refused = await sendInteraction(self ? null : userId, kind);
    if (refused) {
      toast.info(t(`interact.errors.${refused}`, { name }));
      if (refused === "not_here" || refused === "not_checked_in") void refetchSessions();
    } else if (kind === "coffee" || kind === "chat") {
      toast.success(t(`interact.sent.${kind}`, { name }));
    }
  }

  function onZoneClick(zone: string) {
    if (zone === "cafe" || zone === "lounge") {
      startTransition(async () => {
        const r = await setPresence("break");
        if (r.ok) toast.success(t("takingBreak"));
      });
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
        <Select value={selection} onValueChange={(v) => { setSelection(v); setPopover(null); setHint(0); }}>
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
          playerId={playerId}
          positions={floorPositions}
          onZoneClick={onZoneClick}
          onCharacterClick={(userId, at) => setPopover({ userId, ...at })}
          onZones={setZones}
          onFloorTap={onFloorTap}
          onPlayerMove={onPlayerMove}
          onGame={(g) => { game.current = g; }}
        />
        {hint > 0 ? <MapHint key={hint} onDismiss={dismissHint} /> : null}
        {popover && popoverPerson ? (
          <CharacterPopover
            person={popoverPerson}
            at={popover}
            checkedInAt={popoverPlaced?.checkedInAt || null}
            place={sessions.find((s) => s.user_id === popover.userId && s.method === "field")?.checkin_place ?? null}
            onLeave={!!popoverPlaced?.onLeave}
            card={initial.currentCards[popover.userId]}
            self={popover.userId === viewerId}
            canAct={canAct && bothOnFloor(sessions, viewerId, popover.userId, selection)}
            onAct={(kind) => void act(popover.userId, kind)}
            onClose={() => setPopover(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
