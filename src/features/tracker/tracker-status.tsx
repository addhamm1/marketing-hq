"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { Badge } from "@/components/ui/badge";
import type { Stage } from "@/features/boards/types";
import { PORTAL_STATUS_STYLE, portalStatus } from "@/features/portal/status";
import { cn } from "@/lib/utils";
import { isReturned, trackerStep, type TrackerAction } from "./progress";

type StatusCard = { stage: Stage | null; returned_reason: string | null; approver_id: string | null };

export function TrackerBadge({ card }: { card: StatusCard }) {
  const t = useTranslations("tracker");
  const status = portalStatus(card.stage, card.returned_reason);
  return (
    <Badge className={cn("border-transparent", PORTAL_STATUS_STYLE[status])}>
      {isReturned(card) ? t("returned") : t(`steps.${trackerStep(card.stage)}`)}
    </Badge>
  );
}

export function NeedsActionTag() {
  const t = useTranslations("tracker");
  return (
    <Badge className="bg-destructive gap-1 border-transparent text-white">
      <AlertCircle className="size-3" aria-hidden />
      {t("needsAction")}
    </Badge>
  );
}

/** One plain sentence saying where the request stands for this reader. */
export function useTrackerHeadline() {
  const t = useTranslations("tracker.headline");
  const name = usePersonName();
  return (card: StatusCard, action: TrackerAction) => {
    if (action === "resubmit") return t("resubmit");
    if (action === "confirm") return t("confirm");
    if (isReturned(card)) return t("returned");
    const step = trackerStep(card.stage);
    if (step === "confirmation") return t("confirmation", { name: name(card.approver_id) });
    return t(step);
  };
}
