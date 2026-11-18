"use client";

import { useLocale, useTranslations } from "next-intl";
import { FieldError } from "@/components/ui/field";
import { useMessage } from "@/hooks/use-message";
import { cn } from "@/lib/utils";
import { weekdayLabels } from "./series-rule";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type Props = { value: number[]; onChange: (value: number[]) => void; error?: string };

const toggleIn = (value: number[], day: number) => (value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);

function DayButton({ on, label, onClick }: { on: boolean; label: string | number; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border text-xs font-medium tabular-nums transition-colors outline-none focus-visible:ring-3",
        on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

/** Saturday to Thursday. Friday is off, so it is not offered. */
export function WeekdayPicker({ value, onChange, error }: Props) {
  const t = useTranslations("meetings.fixed");
  const locale = useLocale();
  const message = useMessage();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("onDays")}</legend>
      <div className="grid grid-cols-6 gap-1">
        {weekdayLabels(locale).map(({ day, label }) => (
          <DayButton key={day} on={value.includes(day)} label={label} onClick={() => onChange(toggleIn(value, day))} />
        ))}
      </div>
      {error ? <FieldError>{message(error)}</FieldError> : null}
    </fieldset>
  );
}

/** Days of the month. A day past the month's end becomes its last day. */
export function MonthDayPicker({ value, onChange, error }: Props) {
  const t = useTranslations("meetings.fixed");
  const message = useMessage();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("onMonthDays")}</legend>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <DayButton key={day} on={value.includes(day)} label={day} onClick={() => onChange(toggleIn(value, day))} />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{t("monthDaysHint")}</p>
      {error ? <FieldError>{message(error)}</FieldError> : null}
    </fieldset>
  );
}
