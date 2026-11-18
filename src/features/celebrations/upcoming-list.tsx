"use client";

import { Award, Cake, CalendarDays } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@/components/states/states";
import { UserAvatar } from "@/components/user-avatar";
import { daysBetween } from "./split";
import type { Celebration } from "./types";

/** Birthdays and work anniversaries ahead. Dates show day and month only: never a year. */
export function UpcomingList({ items, today }: { items: Celebration[] | null; today: string }) {
  const t = useTranslations("celebrations.upcoming");
  const format = useFormatter();
  return (
    <section aria-labelledby="upcoming-title" className="min-w-0">
      <h2 id="upcoming-title" className="font-semibold">{t("title")}</h2>
      <p className="text-muted-foreground mb-3 text-sm">{t("subtitle")}</p>
      {items === null ? <ErrorState title={t("errorTitle")} body={t("errorBody")} /> : null}
      {items?.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-8" aria-hidden />} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : null}
      {items?.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {items.map((c) => {
            const Icon = c.kind === "birthday" ? Cake : Award;
            return (
              <li key={`${c.kind}-${c.user_id}-${c.day}`} className="flex items-center gap-3 p-3" data-testid="upcoming-item">
                <UserAvatar userId={c.user_id} name={c.display_name} size={32} tooltip={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.display_name}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">
                      {c.kind === "birthday" ? t("birthday") : t("anniversary", { years: c.years ?? 0 })}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-sm font-medium">
                    {format.dateTime(new Date(`${c.day}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" })}
                  </p>
                  <p className="text-muted-foreground text-xs">{t("inDays", { days: daysBetween(today, c.day) })}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
