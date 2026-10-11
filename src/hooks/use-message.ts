"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/** Translate a message key coming from a server action or Zod schema. */
export function useMessage() {
  const t = useTranslations();
  return useCallback(
    (key: string | undefined | null, params?: Record<string, string | number>) => {
      if (!key) return "";
      if (!t.has(key as never)) return t("common.unknownError");
      if (key === "stageActions.errors.missing_fields" && params?.fields) {
        const fields = String(params.fields)
          .split(",")
          .map((f) => (t.has(`card.fields.${f}` as never) ? t(`card.fields.${f}` as never) : f))
          .join(", ");
        return t(key as never, { fields } as never);
      }
      return t(key as never, params as never);
    },
    [t],
  );
}
