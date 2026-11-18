"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatMonth } from "./format";
import { MONTH_REACH, monthsApart, shiftMonth } from "./month";

function Step({ month, current, label, children }: { month: string; current: string; label: string; children: React.ReactNode }) {
  if (Math.abs(monthsApart(current, month)) > MONTH_REACH) {
    return <Button variant="outline" size="icon" disabled aria-label={label}>{children}</Button>;
  }
  return (
    <Button asChild variant="outline" size="icon" aria-label={label}>
      <Link href={`/gates?month=${month}`}>{children}</Link>
    </Button>
  );
}

export function MonthSwitcher({ month, today }: { month: string; today: string }) {
  const t = useTranslations("gates");
  const locale = useLocale();
  const current = today.slice(0, 7);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Step month={shiftMonth(month, -1)} current={current} label={t("prevMonth")}>
        <ChevronLeft className="rtl:rotate-180" aria-hidden />
      </Step>
      <h2 data-testid="gates-month" className="min-w-36 text-center text-base font-semibold" aria-live="polite">
        {formatMonth(month, locale)}
      </h2>
      <Step month={shiftMonth(month, 1)} current={current} label={t("nextMonth")}>
        <ChevronRight className="rtl:rotate-180" aria-hidden />
      </Step>
      {month !== current ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/gates?month=${current}`}>{t("thisMonth")}</Link>
        </Button>
      ) : null}
    </div>
  );
}
