"use client";

import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { absencesOn, type Absence } from "./month";

const COLOR = { leave: "bg-rose-100 text-rose-800", wfh: "bg-sky-100 text-sky-800", field: "bg-amber-100 text-amber-800" };
const WEEK = [6, 0, 1, 2, 3, 4, 5];

export function TeamCalendar({ month, monthLabel, prev, next, today, grid, absences, warnings, teamNames }: {
  month: string; monthLabel: string; prev: string; next: string; today: string;
  grid: { date: string; inMonth: boolean }[]; absences: Absence[];
  warnings: { date: string; teamId: string; userIds: string[] }[]; teamNames: Record<string, string>;
}) {
  const t = useTranslations("calendar");
  const tw = useTranslations("weekdays");
  const name = usePersonName();
  const inMonth = grid.filter((c) => c.inMonth);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t("prev")}><Link href={`/calendar?month=${prev}`}><ChevronLeft className="rtl:rotate-180" aria-hidden /></Link></Button>
        <h2 className="min-w-40 text-center font-semibold">{monthLabel}</h2>
        <Button asChild variant="outline" size="icon" aria-label={t("next")}><Link href={`/calendar?month=${next}`}><ChevronRight className="rtl:rotate-180" aria-hidden /></Link></Button>
        <div className="ms-auto hidden gap-3 text-xs sm:flex">
          {(["leave", "wfh", "field"] as const).map((c) => <span key={c} className="inline-flex items-center gap-1"><span className={cn("size-2.5 rounded-full", COLOR[c].split(" ")[0])} />{t(c)}</span>)}
        </div>
      </div>
      {warnings.length ? (
        <ul className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((w) => (
            <li key={`${w.date}-${w.teamId}`} className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {t("overlap", { count: w.userIds.length, team: teamNames[w.teamId] ?? "", date: w.date })} · {w.userIds.map(name).join(", ")}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Desktop: month grid */}
      <div className="bg-card hidden overflow-hidden rounded-xl border md:block" data-month={month}>
        <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-xs">
          {WEEK.map((d) => <div key={d} className="py-2">{tw(String(d) as "0")}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((c, i) => {
            const items = absencesOn(c.date, absences);
            const friday = i % 7 === 6;
            return (
              <div key={c.date} className={cn("min-h-24 border-e border-b p-1.5 text-xs", !c.inMonth && "bg-muted/40 text-muted-foreground", friday && "bg-muted/30")}>
                <div className={cn("mb-1 flex size-6 items-center justify-center rounded-full tabular-nums", c.date === today && "bg-primary text-primary-foreground")}>{Number(c.date.slice(8))}</div>
                <div className="space-y-0.5">
                  {items.slice(0, 4).map((a, j) => <div key={j} className={cn("truncate rounded px-1 py-0.5", COLOR[a.category])}>{name(a.user_id)}</div>)}
                  {items.length > 4 ? <div className="text-muted-foreground">+{items.length - 4}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: list of days with absences */}
      <ul className="bg-card divide-y rounded-xl border md:hidden">
        {inMonth.filter((c) => absencesOn(c.date, absences).length).map((c) => (
          <li key={c.date} className="flex gap-3 px-4 py-3">
            <span className={cn("w-10 shrink-0 text-center text-sm font-semibold tabular-nums", c.date === today && "text-primary")}>{Number(c.date.slice(8))}</span>
            <div className="flex flex-wrap gap-1">
              {absencesOn(c.date, absences).map((a, j) => <span key={j} className={cn("rounded px-1.5 py-0.5 text-xs", COLOR[a.category])}>{name(a.user_id)} · {t(a.category)}</span>)}
            </div>
          </li>
        ))}
        {!inMonth.some((c) => absencesOn(c.date, absences).length) ? <li className="text-muted-foreground px-4 py-8 text-center text-sm">{t("empty")}</li> : null}
      </ul>
    </div>
  );
}
