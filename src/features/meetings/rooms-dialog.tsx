"use client";

import { DoorOpen, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { roomName } from "./display";
import { RoomForm } from "./room-form";
import { saveRoom } from "./series-actions";
import type { Branch, Room } from "./types";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; rooms: Room[]; branches: Branch[] };

/** Rooms are switched off rather than deleted, so past meetings keep their room. */
export function RoomsDialog({ open, onOpenChange, rooms, branches }: Props) {
  const t = useTranslations("meetings.rooms");
  const locale = useLocale();
  const message = useMessage();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  function setActive(room: Room, is_active: boolean) {
    startTransition(async () => {
      const result = await saveRoom({ ...room, branch_id: room.branch_id ?? "", is_active });
      if (!result.ok) toast.error(message(result.error));
      router.refresh();
    });
  }

  const close = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setEditing(null); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("hint")}</DialogDescription>
        </DialogHeader>

        {editing === "new" ? (
          <RoomForm room={null} branches={branches} onDone={close} onCancel={() => setEditing(null)} />
        ) : (
          <Button variant="outline" className="w-fit" onClick={() => setEditing("new")}><Plus aria-hidden />{t("add")}</Button>
        )}

        {rooms.length ? (
          <ul className="divide-y rounded-lg border">
            {rooms.map((room) => (
              <li key={room.id} className="p-3">
                {editing === room.id ? (
                  <RoomForm room={room} branches={branches} onDone={close} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{roomName(room, locale)}</p>
                      <p className="text-muted-foreground text-xs">
                        {t("seats", { count: room.capacity })} · {room.is_active ? t("active") : t("inactive")}
                      </p>
                    </div>
                    <Switch
                      checked={room.is_active}
                      disabled={pending}
                      onCheckedChange={(v) => setActive(room, v)}
                      aria-label={t("toggle", { name: roomName(room, locale) ?? "" })}
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(room.id)} aria-label={t("edit", { name: roomName(room, locale) ?? "" })}>
                      <Pencil aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<DoorOpen className="size-8" aria-hidden />} title={t("empty")} body={t("emptyBody")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
