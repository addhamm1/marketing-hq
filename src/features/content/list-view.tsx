"use client";

import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { EmptyState } from "@/components/states/states";
import type { Brand } from "@/features/boards/types";
import { PlatformBadges } from "@/features/boards/badges";
import { formatCairo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { STATUS_DOT, type Post } from "./types";

/** Table of posts for scanning, sorting by date, and printing (print stylesheet hides the chrome). */
export function ListView({ posts, brands, onOpen }: { posts: Post[]; brands: Brand[]; onOpen: (id: string) => void }) {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const name = usePersonName();
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "";
  const rows = [...posts].sort((a, b) => (a.scheduled_at ?? "9").localeCompare(b.scheduled_at ?? "9"));
  if (!rows.length) return <EmptyState title={t("noPosts")} />;
  return (
    <div className="bg-card overflow-x-auto rounded-xl border print:border-0">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="text-muted-foreground border-b text-xs">
          <tr>
            {[t("fields.scheduled_at"), t("fields.brand"), t("fields.platforms"), t("fields.format"), t("fields.pillar"), tc("status"), t("fields.owner")].map((h, i) => (
              <th key={i} className="px-3 py-2 text-start font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => onOpen(p.id)}>
              <td className="px-3 py-2 whitespace-nowrap" dir="ltr">{p.scheduled_at ? formatCairo(p.scheduled_at, "EEE d MMM, HH:mm") : "—"}</td>
              <td className="px-3 py-2">{brandName(p.brand_id)}</td>
              <td className="px-3 py-2"><PlatformBadges platforms={p.platforms} /></td>
              <td className="px-3 py-2">{t(`format.${p.format as "feed"}`)}</td>
              <td className="px-3 py-2">{p.pillar ? t(`pillar.${p.pillar}`) : "—"}</td>
              <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", STATUS_DOT[p.status])} />{t(`status.${p.status}`)}</span></td>
              <td className="px-3 py-2">{name(p.owner_id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
