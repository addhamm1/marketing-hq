"use client";

import { useTranslations } from "next-intl";
import { cairoDateString } from "@/lib/dates";
import type { Brand } from "@/features/boards/types";
import { PILLARS, type Post } from "./types";

const PILLAR_COLOR: Record<string, string> = {
  awareness: "#0F766E", engagement: "#F59E0B", insights: "#7C3AED", offer: "#DC2626", community: "#2563EB",
};

/** Per-brand counter against the monthly target, and the month's pillar mix. */
export function Counters({ posts, brands, month, target }: { posts: Post[]; brands: Brand[]; month: string; target: number }) {
  const t = useTranslations("content");
  const inMonth = posts.filter((p) => p.scheduled_at && cairoDateString(new Date(p.scheduled_at)).startsWith(month));
  const mix = PILLARS.map((p) => ({ p, n: inMonth.filter((x) => x.pillar === p).length }));
  const total = mix.reduce((s, m) => s + m.n, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      {brands.map((b) => {
        const mine = inMonth.filter((p) => p.brand_id === b.id);
        const published = mine.filter((p) => p.status === "published").length;
        const scheduled = mine.filter((p) => p.status === "scheduled").length;
        const pct = Math.min(100, ((published + scheduled) / Math.max(target, 1)) * 100);
        return (
          <div key={b.id} className="min-w-40 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="font-medium">{b.name}</span>
              <span className="text-muted-foreground tabular-nums">{t("counter", { published, scheduled, target })}</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: b.color }} />
            </div>
          </div>
        );
      })}
      {total ? (
        <div className="ms-auto min-w-48 space-y-1">
          <span className="text-muted-foreground">{t("pillarMix")}</span>
          <div className="flex h-2 overflow-hidden rounded-full" role="img" aria-label={mix.map((m) => `${t(`pillar.${m.p}`)} ${m.n}`).join(", ")}>
            {mix.filter((m) => m.n).map((m) => (
              <span key={m.p} title={`${t(`pillar.${m.p}`)}: ${m.n}`} style={{ width: `${(m.n / total) * 100}%`, backgroundColor: PILLAR_COLOR[m.p] }} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
