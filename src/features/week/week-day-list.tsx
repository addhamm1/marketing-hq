"use client";

import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCairoDate } from "./format";
import type { WeekCell, WeekPerson } from "./people";
import { WeekChip } from "./week-chip";
import { canEditCell, PersonName, type EditTarget } from "./week-grid";

type Props = {
  people: WeekPerson[];
  days: string[];
  today: string;
  label: (cell: WeekCell) => string;
  onEdit: (target: EditTarget) => void;
};

/** Phones and small tablets: pick a day, read one simple list. */
export function WeekDayList({ people, days, today, label, onEdit }: Props) {
  const t = useTranslations("week");
  const locale = useLocale();
  const [selected, setSelected] = useState(days.includes(today) ? today : days[0]);
  const dayName = formatCairoDate(selected, locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="lg:hidden" data-testid="week-day-list">
      <div role="group" aria-label={t("chooseDay")} className="mb-3 grid grid-cols-6 gap-1">
        {days.map((day) => {
          const active = day === selected;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={active}
              aria-current={day === today ? "date" : undefined}
              onClick={() => setSelected(day)}
              className={cn(
                "focus-visible:ring-ring/50 flex min-w-0 flex-col items-center rounded-lg border px-0.5 py-1.5 text-xs outline-none focus-visible:ring-3",
                active ? "border-primary bg-primary text-primary-foreground font-semibold" : "bg-card",
              )}
            >
              <span className="max-w-full truncate">{formatCairoDate(day, locale, { weekday: "short" })}</span>
              <span className="text-sm">{formatCairoDate(day, locale, { day: "numeric" })}</span>
              <span className="h-4 max-w-full truncate text-[0.625rem] leading-4">{day === today ? t("today") : ""}</span>
            </button>
          );
        })}
      </div>

      <h2 className="mb-2 text-sm font-semibold">{dayName}</h2>
      <ul className="bg-card divide-y rounded-xl border">
        {people.map((person) => {
          const cell = person.days[selected];
          if (!cell) return null;
          const content = (
            <>
              <span className="min-w-0 flex-1"><PersonName person={person} /></span>
              <WeekChip cell={cell} label={label(cell)} className="max-w-[55%] shrink-0" />
            </>
          );
          return (
            <li key={person.id} className={cn(person.isMe && "bg-muted/40")}>
              {canEditCell(person, selected, today) ? (
                <button
                  type="button"
                  onClick={() => onEdit({ person, day: selected, cell })}
                  aria-label={t("editCell", { name: person.name, day: dayName, place: label(cell) })}
                  className="hover:bg-muted focus-visible:ring-ring/50 flex min-h-12 w-full items-center gap-2 px-3 py-2 text-start outline-none focus-visible:ring-3"
                >
                  {content}
                  <Pencil className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                </button>
              ) : (
                <div className="flex min-h-12 items-center gap-2 px-3 py-2">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
