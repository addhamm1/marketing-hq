"use client";

import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { cn } from "@/lib/utils";
import { formatDay, formatRange } from "./format";
import { StatusIcon, StatusLabel } from "./status";
import { agendaEntries, isOverdue } from "./summary";
import type { GateItem, GateKind, GateTrack } from "./types";
import { localName, useDescribeItem } from "./use-item-text";

const GLYPH: Record<GateKind, string> = {
  phase: "bg-brand-stone h-2 w-4 rounded-[2px]",
  gate: "bg-primary size-3 rounded-[2px]",
  checkpoint: "ring-brand-black size-3 rounded-[2px] ring-2 ring-inset",
  recurring: "bg-primary ring-brand-black/70 size-2 rotate-45 rounded-[1px] ring-1",
};

function KindGlyph({ kind }: { kind: GateKind }) {
  return <span className="flex h-5 w-4 shrink-0 items-center justify-center" aria-hidden><span className={GLYPH[kind]} /></span>;
}

function OverdueTag() {
  const t = useTranslations("gates");
  return (
    <span className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
      <Clock className="size-3.5" aria-hidden />
      {t("overdueTag")}
    </span>
  );
}

function ItemRow({ item, today, onSelect }: { item: GateItem; today: string; onSelect: (id: string) => void }) {
  const locale = useLocale();
  const owner = usePersonName();
  return (
    <button type="button" onClick={() => onSelect(item.id)} data-testid="gate-agenda-item"
      className="hover:bg-muted/60 focus-visible:ring-ring flex w-full items-start gap-3 px-3 py-3 text-start transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset">
      <span className="text-muted-foreground w-[4.75rem] shrink-0 pt-0.5 text-xs font-medium tabular-nums">{formatRange(item.starts_on, item.due_on, locale)}</span>
      <KindGlyph kind={item.kind} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug font-medium">{localName(item, locale)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusLabel status={item.status} />
          {isOverdue(item, today) ? <OverdueTag /> : null}
          {item.owner_id ? <span className="text-muted-foreground text-xs">{owner(item.owner_id)}</span> : null}
        </span>
      </span>
    </button>
  );
}

/** A recurring item: its name once, then one small button per date. */
function SeriesRow({ items, today, onSelect }: { items: GateItem[]; today: string; onSelect: (id: string) => void }) {
  const locale = useLocale();
  const t = useTranslations("gates");
  const describe = useDescribeItem(today);
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <span className="text-muted-foreground w-[4.75rem] shrink-0 pt-0.5 text-xs font-medium">{t("dates", { count: items.length })}</span>
      <KindGlyph kind="recurring" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">{localName(items[0], locale)}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => {
            const overdue = isOverdue(item, today);
            return (
              <li key={item.id}>
                <button type="button" onClick={() => onSelect(item.id)} aria-label={describe(item)}
                  className={cn("hover:bg-muted focus-visible:ring-ring inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs tabular-nums transition-colors duration-150 outline-none focus-visible:ring-2", overdue && "border-destructive")}>
                  {overdue ? <Clock className="text-destructive size-3.5" aria-hidden /> : <StatusIcon status={item.status} />}
                  {formatDay(item.due_on, locale)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Below the laptop width the month reads as a list, one section per track. */
export function Agenda({ tracks, items, today, onSelect }: {
  tracks: GateTrack[]; items: GateItem[]; today: string; onSelect: (id: string) => void;
}) {
  const locale = useLocale();
  return (
    <div className="space-y-6" data-testid="gates-agenda">
      {tracks.map((track) => {
        const entries = agendaEntries(items.filter((i) => i.track_id === track.id));
        if (!entries.length) return null;
        const subtitle = locale === "ar" ? track.subtitle_ar : track.subtitle_en;
        return (
          <section key={track.id} aria-labelledby={`track-${track.id}`}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
              <h2 id={`track-${track.id}`} className="text-sm font-semibold">{localName(track, locale)}</h2>
              {subtitle ? <p className="text-muted-foreground text-xs">{subtitle}</p> : null}
            </div>
            <ul className="bg-card divide-y overflow-hidden rounded-xl border">
              {entries.map((entry) => (
                <li key={entry.type === "item" ? entry.item.id : entry.key}>
                  {entry.type === "item"
                    ? <ItemRow item={entry.item} today={today} onSelect={onSelect} />
                    : <SeriesRow items={entry.items} today={today} onSelect={onSelect} />}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
