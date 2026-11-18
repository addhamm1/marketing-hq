"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { MeetingSheet } from "./meeting-sheet";
import type { FormOptions } from "./types";

/** Opens the new-meeting sheet, also straight from a link such as `?new=1&with=<userId>`. */
export function NewMeetingButton({ options, base, openOnLoad, withId }: { options: FormOptions; base: string; openOnLoad: boolean; withId: string | null }) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [open, setOpen] = useState(openOnLoad);
  const [prefill, setPrefill] = useState(openOnLoad ? withId : null);

  function change(next: boolean) {
    setOpen(next);
    if (next) return;
    setPrefill(null);
    // Drop the link's parameters so a reload does not reopen the sheet.
    if (openOnLoad) router.replace(base);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {t("new")}
      </Button>
      <MeetingSheet open={open} onOpenChange={change} options={options} withId={prefill} />
    </>
  );
}
