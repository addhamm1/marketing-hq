"use client";

import { useLocale, useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { daysInMonth } from "./birthday";

const NONE = "none";

export function monthName(month: number, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "long", timeZone: "UTC" }).format(Date.UTC(2024, month - 1, 1));
}

type Value = number | string | null | undefined;
const asText = (v: Value) => (v === null || v === undefined || v === "" ? NONE : String(v));

/** Month and day of a birthday. There is deliberately no year. */
export function BirthdaySelect({ idPrefix, month, day, disabled, onChange }: {
  idPrefix: string;
  month: Value;
  day: Value;
  disabled?: boolean;
  onChange: (next: { birth_month: number | null; birth_day: number | null }) => void;
}) {
  const t = useTranslations("launch.birthday");
  const locale = useLocale();
  const monthNumber = asText(month) === NONE ? null : Number(month);
  const dayNumber = asText(day) === NONE ? null : Number(day);
  const max = daysInMonth(monthNumber);

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2">
      <Select
        value={asText(month)}
        disabled={disabled}
        onValueChange={(v) => {
          const next = v === NONE ? null : Number(v);
          // A shorter month cannot keep a day it does not have.
          onChange({ birth_month: next, birth_day: next === null || (dayNumber ?? 0) > daysInMonth(next) ? null : dayNumber });
        }}
      >
        <SelectTrigger id={`${idPrefix}-month`} className="w-full" aria-label={t("month")}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t("month")}</SelectItem>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={String(m)}>{monthName(m, locale)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        value={asText(day)}
        disabled={disabled || monthNumber === null}
        onValueChange={(v) => onChange({ birth_month: monthNumber, birth_day: v === NONE ? null : Number(v) })}
      >
        <SelectTrigger id={`${idPrefix}-day`} className="w-full" aria-label={t("day")}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t("day")}</SelectItem>
          {Array.from({ length: max }, (_, i) => i + 1).map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
