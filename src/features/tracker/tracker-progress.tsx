"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CardDetail } from "@/features/boards/card-sheet/detail-query";
import { formatCairoDate } from "@/features/week/format";
import { isReturned, trackerStep, type TrackerAction } from "./progress";
import { buildTimeline, lastMovedAt, type CardTimeline, type TimelineEntry } from "./timeline";
import { useTrackerHeadline } from "./tracker-status";
import { TrackerStepper } from "./tracker-stepper";

const DATE_TIME: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };

function TimelineLine({ entry }: { entry: TimelineEntry }) {
  const t = useTranslations("tracker.timeline");
  const locale = useLocale();
  return (
    <li className="relative ps-5">
      <span className="bg-primary-ink absolute start-0 top-1.5 size-2 rounded-full" aria-hidden />
      <p className="text-sm">
        {entry.kind === "date_changed"
          ? t("date_changed", { date: formatCairoDate(entry.date ?? entry.at, locale) })
          : t(entry.kind)}
      </p>
      <time dateTime={entry.at} className="text-muted-foreground text-xs">{formatCairoDate(entry.at, locale, DATE_TIME)}</time>
    </li>
  );
}

/** Where the request stands: stepper, expected dates and its history in plain language. */
export function TrackerProgress({ card, timeline, action }: { card: CardDetail; timeline: CardTimeline; action: TrackerAction }) {
  const t = useTranslations("tracker");
  const locale = useLocale();
  const headline = useTrackerHeadline();
  const step = trackerStep(card.stage);
  const delivered = step === "delivered";
  const entries = buildTimeline(timeline, card.created_at).reverse();
  const moved = lastMovedAt(timeline.periods, card.created_at);
  const date = (value: string) => formatCairoDate(value, locale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <section className="bg-card space-y-4 rounded-xl border p-4">
        <h2 className="sr-only">{t("progress")}</h2>
        <TrackerStepper step={step} attention={!!action || isReturned(card)} />
        <p className="text-sm font-medium">{headline(card, action)}</p>
        <dl className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs">{delivered ? t("deliveredOn") : t("expected")}</dt>
            <dd className="font-medium">
              {delivered ? date(card.delivered_at ?? moved) : card.due_at ? date(card.due_at) : t("notSet")}
            </dd>
          </div>
          {!delivered && card.stage_due_at ? (
            <div>
              <dt className="text-muted-foreground text-xs">{t("stepDue")}</dt>
              <dd className="font-medium">{date(card.stage_due_at)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground text-xs">{t("lastMoved")}</dt>
            <dd className="font-medium">{formatCairoDate(moved, locale, DATE_TIME)}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-card rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("historyTitle")}</h2>
        <ol className="space-y-3" data-testid="tracker-timeline">
          {entries.map((entry, i) => (
            <TimelineLine key={`${entry.kind}:${entry.at}:${i}`} entry={entry} />
          ))}
        </ol>
      </section>
    </>
  );
}
