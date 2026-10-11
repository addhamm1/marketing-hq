"use client";

import { useTranslations } from "next-intl";
import { HBars } from "./charts";
import { fixed } from "./metrics";
import { Panel } from "./stat";

export function DepartmentsReport({ rows }: { rows: { name: string; sent: number; delivery: number | null; turnaround: number | null }[] }) {
  const t = useTranslations("reports");
  return (
    <div className="space-y-4">
      <Panel title={t("requestsSent")}>
        <HBars data={rows.map((r) => ({ name: r.name, value: r.sent }))} label={t("requestsSent")} />
      </Panel>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="text-muted-foreground border-b text-xs">
            <tr>{["", t("requestsSent"), t("avgDelivery"), t("approvalTurnaround")].map((h, i) => <th key={i} className="px-3 py-2 text-start font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y tabular-nums">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.sent}</td>
                <td className="px-3 py-2">{fixed(r.delivery)}</td>
                <td className="px-3 py-2">{fixed(r.turnaround)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
