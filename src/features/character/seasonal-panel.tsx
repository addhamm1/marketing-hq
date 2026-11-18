"use client";

import { CalendarClock, Lock, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@/components/states/states";
import { SEASONAL_ITEMS, type SeasonalEvent, seasonCalendar } from "@/game/avatar/seasonal";
import type { AvatarConfig, SpriteManifest } from "@/game/avatar/types";
import { OptionTile } from "./option-grid";
import { SpriteThumb } from "./sprite-thumb";

const dayLabel = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/** What is in season now, how long it lasts, and what comes next. */
export function SeasonalPanel({ events, failed, today, manifest, worn, onToggle }: {
  events: SeasonalEvent[];
  failed: boolean;
  today: string;
  manifest: SpriteManifest;
  worn: AvatarConfig;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations("character.seasonal");
  const tOptions = useTranslations("character.options");
  const locale = useLocale();
  if (failed) return <ErrorState title={t("errorTitle")} body={t("errorBody")} />;
  const { now, next } = seasonCalendar(events, today);
  const nameOf = (e: SeasonalEvent) => (locale === "ar" ? e.name_ar : e.name_en);
  const known = (items: string[]) => items.filter((id) => id in SEASONAL_ITEMS);

  return (
    <div className="space-y-6">
      {now.map((event) => (
        <section key={event.key} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-medium"><Sparkles className="text-primary-ink size-4" aria-hidden />{nameOf(event)}</h2>
            <p className="text-muted-foreground text-sm">{t("daysLeft", { count: event.daysLeft })}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {known(event.items).map((id) => {
              const layer = SEASONAL_ITEMS[id];
              return (
                <OptionTile key={id} config={{ ...worn, [layer]: id }} manifest={manifest} view={layer} label={tOptions(id as never)} selected={worn[layer] === id} onPick={() => onToggle(id)} />
              );
            })}
          </div>
        </section>
      ))}

      {now.length === 0 ? <p className="text-muted-foreground text-sm">{t("nothingNow")}</p> : null}

      {next ? (
        <section className="bg-muted/50 space-y-3 rounded-xl border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-medium"><CalendarClock className="text-muted-foreground size-4" aria-hidden />{t("comingNext", { name: nameOf(next) })}</h2>
            <p className="text-muted-foreground text-sm">{t("startsIn", { count: next.daysUntil, date: dayLabel(next.starts_on, locale) })}</p>
          </div>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {known(next.items).map((id) => {
              const layer = SEASONAL_ITEMS[id];
              return (
                <li key={id} className="bg-card relative flex min-w-0 flex-col items-center gap-1 rounded-lg border p-1.5 text-xs">
                  <Lock className="text-muted-foreground absolute end-1 top-1 size-3.5" aria-label={t("locked")} />
                  <SpriteThumb config={{ ...worn, [layer]: id }} manifest={manifest} view={layer} className="opacity-70" />
                  <span className="line-clamp-2 w-full text-center leading-tight">{tOptions(id as never)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {now.length === 0 && !next ? <EmptyState title={t("emptyTitle")} body={t("emptyBody")} /> : null}
    </div>
  );
}
