"use client";

import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MeetingForm } from "./meeting-form";
import type { FormOptions, MeetingDetail } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: FormOptions;
  meeting?: MeetingDetail;
  withId?: string | null;
};

/** New or edit meeting. The form mounts on open, so it always starts from fresh values. */
export function MeetingSheet({ open, onOpenChange, options, meeting, withId }: Props) {
  const t = useTranslations("meetings.form");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pe-12">
          <SheetTitle>{meeting ? t("editTitle") : t("newTitle")}</SheetTitle>
          <SheetDescription>{t("cairoHint")}</SheetDescription>
        </SheetHeader>
        <MeetingForm options={options} meeting={meeting} withId={withId ?? null} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
