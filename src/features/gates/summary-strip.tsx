"use client";

import { CircleCheck, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatWeekdayDay } from "./format";
import type { GateSummary } from "./summary";
import type { GateItem } from "./types";
import { localName } from "./use-item-text";

function Segment({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0 px-4 py-3", className)}>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const LINK = "focus-visible:ring-ring block max-w-full cursor-pointer truncate rounded-sm text-start text-sm font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2";

/** Where the month stands: progress, what is next, what slipped. */
export function SummaryStrip({ summary, onSelect }: { summary: GateSummary<GateItem>; onSelect: (id: string) => void }) {
  const t = useTranslations("gates.summary");
  const locale = useLocale();
  const { done, total, next, daysLeft, overdue } = summary;
  const when = daysLeft === 0 ? t("dueToday") : daysLeft === 1 ? t("dueTomorrow") : t("dueIn", { days: daysLeft ?? 0 });

  return (
    <section aria-label={t("label")} data-testid="gates-summary" className="bg-card grid rounded-xl border sm:grid-cols-3">
      <Segment label={t("done")}>
        <p className="text-sm font-semibold tabular-nums">{t("doneOf", { done, total })}</p>
        <Progress value={total ? (done / total) * 100 : 0} aria-label={t("done")} className="mt-2 max-w-48" />
      </Segment>

      <Segment label={t("next")} className="border-t sm:border-s sm:border-t-0">
        {next ? (
          <>
            <button type="button" className={LINK} onClick={() => onSelect(next.id)}>{localName(next, locale)}</button>
            <p className="text-muted-foreground mt-0.5 text-xs">{when} · {formatWeekdayDay(next.due_on, locale)}</p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noNext")}</p>
        )}
      </Segment>

      <Segment label={t("overdue")} className="border-t sm:border-s sm:border-t-0">
        {overdue.length ? (
          <>
            <p className="text-destructive flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="size-4 shrink-0" aria-hidden />
              {t("overdueCount", { count: overdue.length })}
            </p>
            <button type="button" className={cn(LINK, "text-muted-foreground mt-0.5 text-xs font-normal")} onClick={() => onSelect(overdue[0].id)}>
              {localName(overdue[0], locale)}
            </button>
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <CircleCheck className="text-success size-4 shrink-0" aria-hidden />
            {t("noOverdue")}
          </p>
        )}
      </Segment>
    </section>
  );
}
