"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Bars, HBars } from "./charts";
import { fixed, pct } from "./metrics";
import { Panel, Stat, type DrillCard } from "./stat";

type Item = { name: string; value: number };
type Props = {
  brands: { id: string; name: string }[];
  brand: string;
  stats: { created: { value: number; cards: DrillCard[] }; delivered: { value: number; cards: DrillCard[] }; medianDays: number | null; onTime: number | null; revisions: number | null; late: { value: number; cards: DrillCard[] } };
  perWeek: { week: string; created: number; delivered: number }[];
  openByStage: Item[]; hoursInStage: Item[]; reasons: Item[]; byDepartment: Item[]; byVertical: Item[]; byKind: Item[]; workload: Item[];
};

export function WorkflowDashboard(p: Props) {
  const t = useTranslations("reports");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const empty = (items: Item[]) => !items.length || items.every((i) => !i.value);
  const none = <p className="text-muted-foreground py-6 text-center text-sm">{t("noData")}</p>;
  return (
    <div className="space-y-4">
      <Select value={p.brand} onValueChange={(v) => { const q = new URLSearchParams(sp.toString()); q.set("brand", v); router.replace(`${pathname}?${q}`); }}>
        <SelectTrigger size="sm" className="w-40" aria-label={t("anyBrand")}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyBrand")}</SelectItem>
          {p.brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t("created")} value={p.stats.created.value} cards={p.stats.created.cards} />
        <Stat label={t("delivered")} value={p.stats.delivered.value} cards={p.stats.delivered.cards} />
        <Stat label={t("medianDays")} value={fixed(p.stats.medianDays)} />
        <Stat label={t("onTime")} value={pct(p.stats.onTime)} />
        <Stat label={t("revisions")} value={fixed(p.stats.revisions)} />
        <Stat label={t("lateStrategic")} value={p.stats.late.value} cards={p.stats.late.cards} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("perWeek")}>
          {p.perWeek.some((w) => w.created || w.delivered) ? <Bars data={p.perWeek} x="week" series={[{ key: "created", label: t("created") }, { key: "delivered", label: t("delivered") }]} /> : none}
        </Panel>
        <Panel title={t("openByStage")}>{empty(p.openByStage) ? none : <HBars data={p.openByStage} label={t("openByStage")} />}</Panel>
        <Panel title={t("hoursInStage")}>{empty(p.hoursInStage) ? none : <HBars data={p.hoursInStage} label={t("hoursInStage")} />}</Panel>
        <Panel title={t("revisionReasons")}>{empty(p.reasons) ? none : <HBars data={p.reasons} label={t("revisionReasons")} />}</Panel>
        <Panel title={t("byDepartment")}>{empty(p.byDepartment) ? none : <HBars data={p.byDepartment} label={t("byDepartment")} />}</Panel>
        <Panel title={t("byVertical")}>{empty(p.byVertical) ? none : <HBars data={p.byVertical} label={t("byVertical")} />}</Panel>
        <Panel title={t("byKind")}>{empty(p.byKind) ? none : <HBars data={p.byKind} label={t("byKind")} />}</Panel>
        <Panel title={t("workload")}>{empty(p.workload) ? none : <HBars data={p.workload} label={t("workload")} />}</Panel>
      </div>
    </div>
  );
}
