"use client";

import { useTranslations } from "next-intl";
import { fixed, pct } from "./metrics";
import { Stat, type DrillCard } from "./stat";

export function MyReport(p: { deliveries: DrillCard[]; onTime: number | null; revisions: number | null; daysIn: number; workingDays: number; avgArrival: string | null; late: number }) {
  const t = useTranslations("reports");
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("workflow")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label={t("myDeliveries")} value={p.deliveries.length} cards={p.deliveries} />
          <Stat label={t("myOnTime")} value={pct(p.onTime)} />
          <Stat label={t("myRevisions")} value={fixed(p.revisions)} />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("myAttendance")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label={t("daysIn")} value={`${p.daysIn} / ${p.workingDays}`} />
          <Stat label={t("avgArrival")} value={p.avgArrival ?? "—"} />
          <Stat label={t("lateCount")} value={p.late} />
        </div>
      </section>
    </div>
  );
}
