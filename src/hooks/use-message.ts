"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/** Translate a message key coming from a server action or Zod schema. */
export function useMessage() {
  const t = useTranslations();
  return useCallback(
    (key: string | undefined | null) => {
      if (!key) return "";
      return t.has(key as never) ? t(key as never) : t("common.unknownError");
    },
    [t],
  );
}
