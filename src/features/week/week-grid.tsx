"use client";

import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCairoDate } from "./format";
import type { WeekCell, WeekPerson } from "./people";
import { isPlannableDay } from "./plan-rules";
import { WeekChip } from "./week-chip";

export type EditTarget = { person: WeekPerson; day: string; cell: WeekCell };

export function canEditCell(person: WeekPerson, day: string, today: string) {
  const cell = person.days[day];
  return !!cell && person.canEdit && !cell.locked && isPlannableDay(day, today);
}

export function PersonName({ person }: { person: WeekPerson }) {
  const t = useTranslations("week");
  return (
    <span className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-medium">{person.name}</span>
        {person.isMe ? <Badge variant="secondary" className="shrink-0">{t("you")}</Badge> : null}
      </span>
      {person.title ? <span className="text-muted-foreground truncate text-xs font-normal">{person.title}</span> : null}
    </span>
  );
}

type Props = {
  people: WeekPerson[];
  days: string[];
  today: string;
  label: (cell: WeekCell) => string;
  onEdit: (target: EditTarget) => void;
};

export function WeekGrid({ people, days, today, label, onEdit }: Props) {
  const t = useTranslations("week");
  const locale = useLocale();
  const dayName = (day: string) => formatCairoDate(day, locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="bg-card hidden overflow-x-auto rounded-xl border lg:block" data-testid="week-grid">
      <table className="w-full min-w-[52rem] table-fixed border-collapse">
        <caption className="sr-only">{t("title")}</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="bg-card sticky start-0 z-10 w-44 px-3 py-2 text-start text-xs font-medium">{t("person")}</th>
            {days.map((day) => {
              const isToday = day === today;
              return (
                <th
                  key={day}
                  scope="col"
                  aria-current={isToday ? "date" : undefined}
                  className={cn("px-2 py-2 text-start text-xs font-medium", isToday && "bg-accent")}
                >
                  <span className="block">{formatCairoDate(day, locale, { weekday: "short" })}</span>
                  <span className={cn("block font-normal", isToday ? "text-accent-foreground" : "text-muted-foreground")}>
                    {isToday ? t("today") : formatCairoDate(day, locale)}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
          {people.map((person) => (
            <tr key={person.id} data-testid={`week-row-${person.id}`} className={cn(person.isMe && "bg-muted/40")}>
              <th scope="row" className={cn("sticky start-0 z-10 px-3 py-2 text-start", person.isMe ? "bg-muted" : "bg-card")}>
                <PersonName person={person} />
              </th>
              {days.map((day) => {
                const cell = person.days[day];
                const editable = canEditCell(person, day, today);
                return (
                  <td key={day} className={cn("px-1.5 py-1.5 align-middle", day === today && "bg-accent/40")}>
                    {!cell ? null : editable ? (
                      <button
                        type="button"
                        onClick={() => onEdit({ person, day, cell })}
                        aria-label={t("editCell", { name: person.name, day: dayName(day), place: label(cell) })}
                        className="group hover:bg-muted focus-visible:ring-ring/50 flex w-full min-w-0 items-center justify-between gap-1 rounded-md p-0.5 outline-none focus-visible:ring-3"
                      >
                        <WeekChip cell={cell} label={label(cell)} />
                        <Pencil className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                      </button>
                    ) : (
                      <div className="flex min-w-0 p-0.5">
                        <WeekChip cell={cell} label={label(cell)} />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
