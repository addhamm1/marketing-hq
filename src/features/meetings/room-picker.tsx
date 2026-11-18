"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roomName } from "./display";
import type { Room } from "./types";

const NONE = "none";

type Props = {
  id: string;
  rooms: Room[];
  value: string;
  onChange: (value: string) => void;
  busy: Set<string>;
  /** False where free or taken has no meaning, as on a fixed meeting's rule. */
  showAvailability?: boolean;
  invalid?: boolean;
};

/** Rooms with whether each is free at the chosen time. A taken room cannot be picked. */
export function RoomPicker({ id, rooms, value, onChange, busy, showAvailability = true, invalid }: Props) {
  const t = useTranslations("meetings.room");
  const locale = useLocale();
  // A room switched off later stays visible on the meetings that already use it.
  const shown = rooms.filter((r) => r.is_active || r.id === value);

  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("none")}</SelectItem>
        {shown.map((room) => {
          const taken = showAvailability && busy.has(room.id);
          return (
            <SelectItem key={room.id} value={room.id} disabled={taken && room.id !== value}>
              <span className="truncate">{roomName(room, locale)}</span>
              <span className="text-muted-foreground text-xs">{t("seats", { count: room.capacity })}</span>
              {showAvailability ? (
                taken ? (
                  <span className="text-destructive inline-flex items-center gap-1 text-xs"><CircleX className="size-3" aria-hidden />{t("taken")}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CircleCheck className="size-3" aria-hidden />{t("free")}</span>
                )
              ) : null}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
