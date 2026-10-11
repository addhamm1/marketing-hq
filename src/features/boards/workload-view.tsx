"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { usePersonName } from "@/components/people-context";
import { EmptyState } from "@/components/states/states";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { STAGE_COLOR } from "./badges";
import type { BoardCard, Stage } from "./types";

const OPEN: Stage[] = ["brief_schedule", "production", "creative_review", "confirmation"];

/** Open cards per person by stage; WIP limit counts production cards (D2-06). */
export function WorkloadView({ cards, wipLimit }: { cards: BoardCard[]; wipLimit: number }) {
  const t = useTranslations("boards");
  const ts = useTranslations("stages");
  const name = usePersonName();
  const rows = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const c of cards) {
      const stage = c.stage ?? "production";
      if (c.stage && !OPEN.includes(c.stage)) continue;
      for (const a of c.assignees) {
        const r = m.get(a.user_id) ?? {};
        r[stage] = (r[stage] ?? 0) + 1;
        m.set(a.user_id, r);
      }
    }
    return [...m.entries()].sort((a, b) => (b[1].production ?? 0) - (a[1].production ?? 0));
  }, [cards]);

  if (!rows.length) return <EmptyState title={t("noWorkload")} />;
  return (
    <div className="bg-card divide-y rounded-xl border">
      <h2 className="px-4 py-3 text-sm font-semibold">{t("workloadTitle")}</h2>
      {rows.map(([userId, counts]) => {
        const production = counts.production ?? 0;
        const over = production > wipLimit;
        return (
          <div key={userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <UserAvatar userId={userId} size={28} />
            <span className="min-w-32 flex-1 font-medium">{name(userId)}</span>
            <div className="flex flex-wrap gap-1.5">
              {OPEN.filter((s) => counts[s]).map((s) => (
                <span key={s} className={cn("rounded-md px-2 py-0.5 text-xs", STAGE_COLOR[s], s === "production" && over && "ring-destructive ring-2")}>
                  {ts(s)} · {counts[s]}
                </span>
              ))}
            </div>
            {over ? <span className="text-destructive text-xs font-medium">{t("wipWarning", { name: name(userId), count: production, limit: wipLimit })}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
