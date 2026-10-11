"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { ErrorState } from "./states";

/** Shared body for error.tsx files: reports to Sentry, offers a retry. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="p-4 sm:p-8">
      <ErrorState
        title={t("errorTitle")}
        body={t("errorBody")}
        action={<Button onClick={reset}>{t("retry")}</Button>}
      />
    </div>
  );
}
