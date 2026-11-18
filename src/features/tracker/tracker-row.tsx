"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { formatCairoDate } from "@/features/week/format";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isReturned, trackerStep } from "./progress";
import type { TrackerRow as Row } from "./queries";
import { NeedsActionTag, TrackerBadge, useTrackerHeadline } from "./tracker-status";
import { TrackerStepperCompact } from "./tracker-stepper";

export function TrackerRow({ card }: { card: Row }) {
  const t = useTranslations("tracker");
  const tk = useTranslations("requestKind");
  const locale = useLocale();
  const name = usePersonName();
  const headline = useTrackerHeadline();
  const step = trackerStep(card.stage);
  const delivered = step === "delivered";
  const date = (value: string) => formatCairoDate(value, locale);

  return (
    <li data-testid="tracker-row" data-bucket={card.bucket}>
      <Link
        href={`/portal/requests/${card.id}`}
        className={cn("hover:bg-muted/40 block space-y-2.5 px-4 py-3.5", card.action && "border-destructive bg-destructive/5 border-s-4")}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <div className="min-w-0 flex-1 basis-48">
            <p className="truncate text-sm font-medium">{card.title}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {card.request_kind ? tk(card.request_kind) : ""} · {name(card.requester_id)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {card.action ? <NeedsActionTag /> : null}
            <TrackerBadge card={card} />
          </div>
        </div>

        <TrackerStepperCompact step={step} attention={!!card.action || isReturned(card)} />
        <p className={cn("text-sm", card.action ? "font-medium" : "text-muted-foreground")}>{headline(card, card.action)}</p>

        <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {delivered ? (
            <div className="flex gap-1">
              <dt>{t("deliveredOn")}</dt>
              <dd className="text-foreground font-medium">{date(card.delivered_at ?? card.last_moved_at)}</dd>
            </div>
          ) : card.due_at ? (
            <div className="flex gap-1">
              <dt>{t("expected")}</dt>
              <dd className="text-foreground font-medium">{date(card.due_at)}</dd>
            </div>
          ) : null}
          {!delivered && card.stage_due_at ? (
            <div className="flex gap-1">
              <dt>{t("stepDue")}</dt>
              <dd className="text-foreground font-medium">{date(card.stage_due_at)}</dd>
            </div>
          ) : null}
          <div className="flex gap-1">
            <dt>{t("lastMoved")}</dt>
            <dd>{date(card.last_moved_at)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}
