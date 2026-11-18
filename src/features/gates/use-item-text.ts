"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { formatRange } from "./format";
import { isOverdue } from "./summary";
import type { GateItem } from "./types";

/** Picks the name in the reader's language. */
export function localName(row: { name_en: string; name_ar: string }, locale: string): string {
  return locale === "ar" ? row.name_ar : row.name_en;
}

/** One sentence for screen readers and tooltips: name, dates, status. */
export function useDescribeItem(today: string) {
  const locale = useLocale();
  const t = useTranslations("gates");
  return useCallback(
    (item: GateItem) => {
      const parts = [localName(item, locale), formatRange(item.starts_on, item.due_on, locale), t(`status.${item.status}`)];
      if (isOverdue(item, today)) parts.push(t("overdueTag"));
      return parts.join(", ");
    },
    [locale, t, today],
  );
}
