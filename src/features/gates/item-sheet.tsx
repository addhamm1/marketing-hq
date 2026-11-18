"use client";

import { Clock, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePersonName } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMessage } from "@/hooks/use-message";
import { deleteGateItem } from "./actions";
import { formatRange } from "./format";
import { ItemForm } from "./item-form";
import { LinkedCards } from "./linked-cards";
import { StatusLabel } from "./status";
import { StatusForm } from "./status-form";
import { isOverdue } from "./summary";
import type { GateItem, GatePerms, GateTrack, LinkedCard } from "./types";
import { localName } from "./use-item-text";

const WIDTH = "gap-0 overflow-y-auto data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg";

export function ItemSheet({ item, track, cards, today, perms, onClose }: {
  item: GateItem; track: GateTrack | null; cards: LinkedCard[]; today: string; perms: GatePerms; onClose: () => void;
}) {
  const t = useTranslations("gates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const owner = usePersonName();
  const message = useMessage();
  const [confirming, setConfirming] = useState(false);
  const [, startTransition] = useTransition();
  const canUpdate = perms.canManage || item.owner_id === perms.userId;

  const remove = () =>
    startTransition(async () => {
      const result = await deleteGateItem(item.id);
      if (!result.ok) return void toast.error(message(result.error));
      toast.success(t("deleted"));
      onClose();
    });

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={locale === "ar" ? "left" : "right"} className={WIDTH}>
        <SheetHeader className="border-b pe-12">
          <p className="text-muted-foreground text-xs font-medium">
            {t(`kind.${item.kind}`)}{track ? ` · ${localName(track, locale)}` : ""}
          </p>
          <SheetTitle className="text-base leading-snug font-semibold">{localName(item, locale)}</SheetTitle>
          <SheetDescription>
            {formatRange(item.starts_on, item.due_on, locale)} · {item.owner_id ? owner(item.owner_id) : t("fields.noOwner")}
          </SheetDescription>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <StatusLabel status={item.status} />
            {isOverdue(item, today) ? (
              <span className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
                <Clock className="size-3.5" aria-hidden />{t("overdueTag")}
              </span>
            ) : null}
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {perms.canManage ? (
            <ItemForm
              key={item.updated_at}
              defaults={{
                id: item.id, month: item.month.slice(0, 7), track_id: item.track_id, kind: item.kind,
                name_en: item.name_en, name_ar: item.name_ar, starts_on: item.starts_on, due_on: item.due_on,
                owner_id: item.owner_id, status: item.status, note: item.note,
              }}
              onDone={onClose}
            />
          ) : canUpdate ? (
            <StatusForm key={item.updated_at} item={item} onDone={onClose} />
          ) : item.note ? (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold">{t("fields.note")}</h3>
              <p className="text-sm whitespace-pre-wrap">{item.note}</p>
            </section>
          ) : null}

          <LinkedCards itemId={item.id} cards={cards} canManage={perms.canManage} />

          {perms.canManage ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden />{t("deleteItem")}
            </Button>
          ) : null}
        </div>
      </SheetContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        confirmLabel={tc("delete")}
        destructive
        onConfirm={remove}
      />
    </Sheet>
  );
}

export function NewItemSheet({ month, today, tracks, onClose }: { month: string; today: string; tracks: GateTrack[]; onClose: () => void }) {
  const t = useTranslations("gates");
  const locale = useLocale();
  const date = today.slice(0, 7) === month ? today : `${month}-01`;
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={locale === "ar" ? "left" : "right"} className={WIDTH}>
        <SheetHeader className="border-b pe-12">
          <SheetTitle className="text-base font-semibold">{t("addItem")}</SheetTitle>
          <SheetDescription>{t("addItemHint")}</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <ItemForm
            tracks={tracks}
            defaults={{
              id: null, month, track_id: tracks[0]?.id ?? "", kind: "gate", name_en: "", name_ar: "",
              starts_on: date, due_on: date, owner_id: null, status: "not_started", note: "",
            }}
            onDone={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
