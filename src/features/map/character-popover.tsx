"use client";

import { CalendarPlus, MapPinned, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PRESENCE_DOT } from "@/components/shell/presence-picker";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import type { MapInteractionKind } from "@/game";
import { Link } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CharacterActions } from "./character-actions";
import type { MapPerson } from "./types";

export function CharacterPopover({ person, at, checkedInAt, place, onLeave, card, self, canAct, onAct, onClose }: {
  person: MapPerson;
  at: { x: number; y: number };
  checkedInAt: string | null;
  /** Field day place name (never coordinates). */
  place?: string | null;
  onLeave: boolean;
  card?: { id: string; title: string; board_id: string };
  /** This is the viewer's own character. */
  self: boolean;
  /** Both people are checked in on this floor. */
  canAct: boolean;
  onAct: (kind: MapInteractionKind) => void;
  onClose: () => void;
}) {
  const t = useTranslations("map");
  const tp = useTranslations("presence");
  const tc = useTranslations("common");
  return (
    <div
      role="dialog"
      aria-label={person.name}
      className="bg-popover text-popover-foreground absolute z-20 w-64 rounded-xl border p-3 shadow-lg"
      // Above the character, but never past the edges of the map.
      style={{
        left: `clamp(8.25rem, ${at.x}px, calc(100% - 8.25rem))`,
        top: at.y - 8,
        translate: `-50% max(-100%, ${16 - at.y}px)`,
      }}
    >
      <div className="flex items-start gap-3">
        <UserAvatar userId={person.id} name={person.name} size={36} tooltip={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{person.name}</p>
          {person.title ? <p className="text-muted-foreground truncate text-xs">{person.title}</p> : null}
          <p className="mt-1 flex items-center gap-1.5 text-xs">
            <span className={cn("size-2 rounded-full", PRESENCE_DOT[person.presence])} aria-hidden />
            {onLeave ? t("onLeave") : tp(person.presence)}
          </p>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={tc("close")}><X aria-hidden /></Button>
      </div>
      {checkedInAt ? (
        <p className="text-muted-foreground mt-2 text-xs">{t("checkedInSince", { time: formatCairo(checkedInAt, "HH:mm") })}</p>
      ) : null}
      {place ? (
        <p className="mt-1 flex items-center gap-1 text-xs">
          <MapPinned className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t("fieldPlace", { place })}</span>
        </p>
      ) : null}
      {card ? (
        <Link href={`/boards/${card.board_id}?card=${card.id}`} className="bg-muted/60 hover:bg-muted mt-2 block rounded-md px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">{t("currentCard")}: </span>
          <span className="font-medium">{card.title}</span>
        </Link>
      ) : null}
      {canAct ? <CharacterActions self={self} onAct={onAct} /> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="flex-auto">
          <Link href={`/people/${person.id}`}><UserRound aria-hidden /> {t("viewProfile")}</Link>
        </Button>
        {self ? null : (
          <Button asChild size="sm" variant="outline" className="flex-auto">
            <Link href={`/meetings?new=1&with=${person.id}`}><CalendarPlus aria-hidden /> {t("requestMeeting")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
