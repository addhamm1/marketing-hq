"use client";

import { Ban, CalendarPlus, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { cancelMeeting } from "./actions";
import { MeetingSheet } from "./meeting-sheet";
import type { FormOptions, MeetingDetail } from "./types";

type Props = { meeting: MeetingDetail; options: FormOptions; canEdit: boolean; canDownload: boolean };

export function MeetingToolbar({ meeting, options, canEdit, canDownload }: Props) {
  const t = useTranslations("meetings.detail");
  const message = useMessage();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelMeeting({ id: meeting.id });
      if (!result.ok) {
        toast.error(message(result.error));
        return;
      }
      toast.success(t("cancelled"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canDownload ? (
        <Button variant="outline" asChild>
          <a href={`/api/meetings/${meeting.id}/ics`} download>
            <CalendarPlus aria-hidden />
            {t("addToCalendar")}
          </a>
        </Button>
      ) : null}
      {canEdit ? (
        <>
          <Button variant="outline" onClick={() => setEditing(true)}><Pencil aria-hidden />{t("edit")}</Button>
          <Button variant="destructive" disabled={pending} onClick={() => setCancelling(true)}><Ban aria-hidden />{t("cancel")}</Button>
          <MeetingSheet open={editing} onOpenChange={setEditing} options={options} meeting={meeting} />
          <ConfirmDialog
            open={cancelling}
            onOpenChange={setCancelling}
            title={t("cancelTitle")}
            body={t("cancelBody")}
            confirmLabel={t("cancel")}
            destructive
            onConfirm={cancel}
          />
        </>
      ) : null}
    </div>
  );
}
