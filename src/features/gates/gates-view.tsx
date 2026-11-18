"use client";

import { CalendarRange, Plus, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Agenda } from "./agenda";
import { ItemSheet, NewItemSheet } from "./item-sheet";
import { Legend } from "./legend";
import { monthInfo } from "./month";
import { MonthSwitcher } from "./month-switcher";
import { summarise } from "./summary";
import { SummaryStrip } from "./summary-strip";
import { Timeline } from "./timeline";
import type { GateItem, GatePerms, GateTrack, LinkedCard } from "./types";

export function GatesView({ month, today, tracks, items, cards, perms }: {
  month: string; today: string; tracks: GateTrack[]; items: GateItem[]; cards: LinkedCard[]; perms: GatePerms;
}) {
  const t = useTranslations("gates");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const info = useMemo(() => monthInfo(month), [month]);
  const summary = useMemo(() => summarise(items, today), [items, today]);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher month={month} today={today} />
        {perms.canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/gates/rhythm"><Settings2 aria-hidden />{t("editRhythm")}</Link>
            </Button>
            <Button size="sm" onClick={() => setAdding(true)} disabled={!tracks.length}><Plus aria-hidden />{t("addItem")}</Button>
          </div>
        ) : null}
      </div>

      {items.length ? (
        <>
          <SummaryStrip summary={summary} onSelect={setSelectedId} />
          <div className="hidden lg:block">
            <Timeline info={info} today={today} tracks={tracks} items={items} onSelect={setSelectedId} />
          </div>
          <div className="lg:hidden">
            <Agenda tracks={tracks} items={items} today={today} onSelect={setSelectedId} />
          </div>
          <Legend />
        </>
      ) : (
        <EmptyState
          icon={<CalendarRange className="size-8" aria-hidden />}
          title={t("emptyTitle")}
          body={perms.canManage ? t("emptyBodyManager") : t("emptyBody")}
        />
      )}

      {selected ? (
        <ItemSheet
          key={selected.id}
          item={selected}
          track={tracks.find((tr) => tr.id === selected.track_id) ?? null}
          cards={cards.filter((c) => c.item_id === selected.id)}
          today={today}
          perms={perms}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
      {adding ? <NewItemSheet month={month} today={today} tracks={tracks} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
