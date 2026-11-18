"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { narrowWeekday } from "./format";
import { layoutTrack, spanOf, spanStyle, todayPct } from "./layout";
import { dateOfDay, weekdayOf, type MonthInfo } from "./month";
import { TimelineRow } from "./timeline-row";
import type { GateItem, GateTrack } from "./types";
import { useDescribeItem } from "./use-item-text";

function DayRuler({ info, today, days }: { info: MonthInfo; today: string; days: string[] }) {
  const locale = useLocale();
  return (
    <div
      className="relative z-10 grid border-b"
      style={{ gridColumn: 2, gridRow: 1, gridTemplateColumns: `repeat(${info.days}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {days.map((date) => {
        const isToday = date === today;
        return (
          <div key={date} className={cn("flex flex-col items-center gap-0.5 py-2 tabular-nums", weekdayOf(date) === 5 && "text-muted-foreground/60")}>
            <span className="text-muted-foreground text-[10px] leading-none">{narrowWeekday(date, locale)}</span>
            <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px] font-medium", isToday && "bg-info font-bold text-white")}>
              {Number(date.slice(8))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The month as a chart: a day ruler, then one row per track. Mirrors in Arabic. */
export function Timeline({ info, today, tracks, items, onSelect }: {
  info: MonthInfo; today: string; tracks: GateTrack[]; items: GateItem[]; onSelect: (id: string) => void;
}) {
  const t = useTranslations("gates");
  const describe = useDescribeItem(today);
  const days = useMemo(() => Array.from({ length: info.days }, (_, i) => dateOfDay(info, i + 1)), [info]);
  const rows = useMemo(
    () => tracks.map((track) => ({ track, layout: layoutTrack(items.filter((i) => i.track_id === track.id), track.key, info) })),
    [tracks, items, info],
  );
  const line = todayPct(today, info);
  const allRows = `1 / span ${tracks.length + 1}`;

  return (
    <section aria-label={t("timelineLabel")} data-testid="gates-timeline" className="bg-card overflow-hidden rounded-xl border">
      <div className="grid grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)]">
        <div style={{ gridColumn: 1, gridRow: 1 }} className="text-muted-foreground flex items-end border-e border-b px-4 py-2 text-xs font-medium">
          {t("trackColumn")}
        </div>
        <DayRuler info={info} today={today} days={days} />

        {/* Fridays are off: a quiet band behind the marks. */}
        <div style={{ gridColumn: 2, gridRow: allRows }} className="pointer-events-none relative" aria-hidden>
          {days.filter((d) => weekdayOf(d) === 5).map((d) => (
            <div key={d} className="bg-muted/70 absolute inset-y-0" style={spanStyle(spanOf(d, d, info))} />
          ))}
        </div>

        {rows.map(({ track, layout }, i) => (
          <TimelineRow
            key={track.id}
            track={track}
            layout={layout}
            row={i + 2}
            last={i === rows.length - 1}
            ctx={{ today, describe, onSelect }}
          />
        ))}

        {line !== null ? (
          <div style={{ gridColumn: 2, gridRow: `2 / span ${tracks.length}` }} className="pointer-events-none relative z-20" aria-hidden>
            <div data-testid="gates-today-line" className="bg-info absolute inset-y-0 w-px" style={{ insetInlineStart: `${line}%` }} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
