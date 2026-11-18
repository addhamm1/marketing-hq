"use client";

import { CalendarClock, Clock, Pencil, Square, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePersonName } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { cairoInstant } from "@/lib/dates";
import { meetingTitle } from "./display";
import { stopSeries } from "./series-actions";
import { weekdayList } from "./series-rule";
import { formatDay } from "./time";
import type { Series } from "./types";

export function SeriesRow({ series, canManage, onEdit }: { series: Series; canManage: boolean; onEdit: () => void }) {
  const t = useTranslations("meetings.fixed");
  const locale = useLocale();
  const message = useMessage();
  const router = useRouter();
  const personName = usePersonName();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const rule =
    series.cadence === "daily"
      ? t("rule.daily")
      : series.cadence === "weekly"
        ? t("rule.weekly", { days: weekdayList(series.weekdays, locale).join(locale === "ar" ? "، " : ", ") })
        : t("rule.monthly", { days: [...series.month_days].sort((a, b) => a - b).join(locale === "ar" ? "، " : ", ") });

  function stop() {
    startTransition(async () => {
      const result = await stopSeries({ id: series.id });
      if (!result.ok) {
        toast.error(message(result.error));
        return;
      }
      toast.success(t("stopped"));
      router.refresh();
    });
  }

  return (
    <div className="bg-card flex flex-wrap items-start gap-x-3 gap-y-2 rounded-xl border p-3">
      <div className="min-w-0 flex-1 basis-56">
        <p dir="auto" className="truncate text-sm font-medium">{meetingTitle(series, locale)}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{rule}</p>
        <dl className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1">
            <dt><Clock className="size-3" aria-label={t("time")} /></dt>
            <dd className="tabular-nums"><span dir="ltr">{series.start_time.slice(0, 5)}</span> · {t("minutes", { count: series.duration_minutes })}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <dt><User className="size-3" aria-label={t("owner")} /></dt>
            <dd className="truncate">{series.owner_id ? personName(series.owner_id) : t("noOwner")}</dd>
          </div>
          <div className="flex items-center gap-1">
            <dt><CalendarClock className="size-3" aria-label={t("next")} /></dt>
            <dd>{series.next_on ? t("nextOn", { date: formatDay(cairoInstant(series.next_on, "12:00").toISOString(), locale) }) : t("noNext")}</dd>
          </div>
        </dl>
      </div>
      {canManage ? (
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" size="sm" onClick={onEdit} aria-label={t("editNamed", { title: series.title })}><Pencil aria-hidden />{t("edit")}</Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(true)} aria-label={t("stopNamed", { title: series.title })}><Square aria-hidden />{t("stop")}</Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("stopTitle")}
        body={t("stopBody")}
        confirmLabel={t("stop")}
        destructive
        onConfirm={stop}
      />
    </div>
  );
}
