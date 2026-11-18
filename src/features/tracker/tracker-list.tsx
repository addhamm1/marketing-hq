"use client";

import { AlertCircle, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import type { TrackerBucket } from "./progress";
import type { TrackerRow as Row } from "./queries";
import { TrackerRow } from "./tracker-row";

type Filter = "all" | TrackerBucket;
const FILTERS: Filter[] = ["all", "needs_action", "in_progress", "delivered"];

export function TrackerList({ rows }: { rows: Row[] }) {
  const t = useTranslations("tracker");
  const tp = useTranslations("portal");
  const [filter, setFilter] = useState<Filter>("all");
  const count = (f: Filter) => (f === "all" ? rows.length : rows.filter((r) => r.bucket === f).length);
  const needsAction = count("needs_action");
  const shown = filter === "all" ? rows : rows.filter((r) => r.bucket === filter);

  if (!rows.length) {
    return <EmptyState icon={<Inbox className="size-8" aria-hidden />} title={tp("noRequests")} body={tp("noRequestsBody")} />;
  }

  return (
    <div className="space-y-4">
      {needsAction > 0 ? (
        <div role="status" className="border-destructive/40 bg-destructive/5 flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <AlertCircle className="text-destructive size-5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 basis-48 text-sm font-semibold">{t("needsActionCount", { count: needsAction })}</p>
          {filter !== "needs_action" ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setFilter("needs_action")}>
              {t("showThem")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {t(`filters.${f}`)}
            <span className="tabular-nums opacity-70">{count(f)}</span>
          </Button>
        ))}
      </div>

      {shown.length ? (
        <ul className="bg-card divide-y overflow-hidden rounded-xl border">
          {shown.map((card) => (
            <TrackerRow key={card.id} card={card} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Inbox className="size-8" aria-hidden />} title={t(`empty.${filter as TrackerBucket}`)} />
      )}
    </div>
  );
}
