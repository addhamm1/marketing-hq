"use client";

import { AlertCircle, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { TRACKER_STEPS, type TrackerStep } from "./progress";

type Props = { step: TrackerStep; attention?: boolean };

/** Thin progress bar for lists; the current step is spelled out for screen readers. */
export function TrackerStepperCompact({ step, attention }: Props) {
  const t = useTranslations("tracker");
  const current = TRACKER_STEPS.indexOf(step);
  return (
    <div
      role="img"
      aria-label={t("stepOf", { current: current + 1, total: TRACKER_STEPS.length, step: t(`steps.${step}`) })}
      className="flex items-center gap-1"
    >
      {TRACKER_STEPS.map((s, i) => (
        <span
          key={s}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < current || (i === current && !attention) ? "bg-primary" : i === current ? "bg-destructive" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

/** Full stepper: stacked on phones, side by side from the small breakpoint up. */
export function TrackerStepper({ step, attention }: Props) {
  const t = useTranslations("tracker");
  const current = TRACKER_STEPS.indexOf(step);
  return (
    <ol className="grid gap-2 sm:grid-cols-5 sm:gap-1" aria-label={t("progress")} data-testid="tracker-stepper">
      {TRACKER_STEPS.map((s, i) => {
        const isCurrent = i === current;
        const done = i < current || (isCurrent && s === "delivered");
        const alert = isCurrent && attention;
        return (
          <li
            key={s}
            aria-current={isCurrent ? "step" : undefined}
            className="flex items-center gap-2.5 sm:flex-col sm:items-start sm:gap-1.5"
          >
            <span className="flex w-auto items-center gap-1 sm:w-full">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  isCurrent && !done && !alert && "border-primary-ink text-primary-ink border-2",
                  alert && "border-destructive bg-destructive text-white",
                  !done && !isCurrent && "text-muted-foreground",
                )}
              >
                {alert ? <AlertCircle className="size-3.5" aria-hidden /> : done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              {i < TRACKER_STEPS.length - 1 ? (
                <span className={cn("hidden h-0.5 flex-1 rounded-full sm:block", i < current ? "bg-primary" : "bg-muted")} aria-hidden />
              ) : null}
            </span>
            <span className={cn("text-sm sm:text-xs", isCurrent ? "font-semibold" : done ? "" : "text-muted-foreground")}>
              {t(`steps.${s}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
