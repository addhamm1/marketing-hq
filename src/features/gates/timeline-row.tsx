"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { spanStyle, splitName, type Lane, type TrackLayout } from "./layout";
import { BarMark, DayMark, RecurringMark } from "./timeline-marks";
import type { GateItem, GateTrack } from "./types";
import { localName } from "./use-item-text";

/** A label is one line, or up to three when it has words after the colon. */
const LABEL_ROW_REM = { short: 1.25, long: 3 };

type RowContext = { today: string; describe: (item: GateItem) => string; onSelect: (id: string) => void };

function GateLabels({ lane }: { lane: Lane<GateItem> }) {
  const locale = useLocale();
  if (!lane.labelRows) return null;
  const long = lane.marks.some((m) => m.label && splitName(localName(m.item, locale)).tail);
  const rowRem = long ? LABEL_ROW_REM.long : LABEL_ROW_REM.short;
  return (
    <div className="relative mt-1" style={{ blockSize: `${lane.labelRows * rowRem}rem` }} aria-hidden>
      {lane.marks.flatMap((m) => {
        if (!m.label) return [];
        const { head, tail } = splitName(localName(m.item, locale));
        return (
          <div
            key={m.item.id}
            className="absolute px-1 text-[11px] leading-tight"
            style={{ ...spanStyle(m.label), insetBlockStart: `${m.label.row * rowRem}rem`, textAlign: m.label.align }}
          >
            <span className="block truncate font-semibold">{head}</span>
            {tail ? <span className="text-muted-foreground line-clamp-2">{tail}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function LaneStrip({ lane, ctx }: { lane: Lane<GateItem>; ctx: RowContext }) {
  return (
    <div>
      <div className="relative h-9">
        {lane.marks.map((mark) => {
          const props = { mark, today: ctx.today, label: ctx.describe(mark.item), onSelect: ctx.onSelect };
          return mark.item.kind === "phase" ? <BarMark key={mark.item.id} {...props} /> : <DayMark key={mark.item.id} {...props} />;
        })}
      </div>
      <GateLabels lane={lane} />
    </div>
  );
}

/** One track: its name in the first column, its marks across the month in the second. */
export function TimelineRow({ track, layout, row, last, ctx }: {
  track: GateTrack; layout: TrackLayout<GateItem>; row: number; last: boolean; ctx: RowContext;
}) {
  const locale = useLocale();
  const subtitle = locale === "ar" ? track.subtitle_ar : track.subtitle_en;
  return (
    <>
      <div style={{ gridColumn: 1, gridRow: row }} className={cn("border-e px-4 py-3", !last && "border-b")}>
        <h3 className="text-sm leading-snug font-semibold">{localName(track, locale)}</h3>
        {subtitle ? <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p> : null}
      </div>
      <div style={{ gridColumn: 2, gridRow: row }} className={cn("relative z-10 min-w-0 space-y-1.5 py-3", !last && "border-b")}>
        {layout.lanes.map((lane, i) => <LaneStrip key={i} lane={lane} ctx={ctx} />)}
        {layout.recurring.length ? (
          <div className="relative h-6">
            {layout.recurring.map((mark) => (
              <RecurringMark key={mark.item.id} mark={mark} today={ctx.today} label={ctx.describe(mark.item)} onSelect={ctx.onSelect} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
