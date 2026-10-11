"use client";

import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/states/states";
import { HBars } from "./charts";
import { averageClock, mean, pct } from "./metrics";
import { Panel, Stat } from "./stat";

export type AttendanceRow = {
  id: string; name: string; daysIn: number; rate: number | null; avgArrival: string | null;
  late: number; remote: number; field: number; leaveUsed: number; leaveAllowance: number;
};

export function AttendanceReport({ rows, workingDays }: { rows: AttendanceRow[]; workingDays: number }) {
  const t = useTranslations("reports");
  if (!rows.length) return <EmptyState title={t("noData")} />;
  const arrivals = rows.map((r) => r.avgArrival).filter(Boolean) as string[];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("checkinRate")} value={pct(mean(rows.map((r) => r.rate ?? 0)))} hint={`${workingDays}`} />
        <Stat label={t("avgArrival")} value={averageClock(arrivals) ?? "—"} />
        <Stat label={t("lateCount")} value={rows.reduce((s, r) => s + r.late, 0)} />
        <Stat label={t("remoteDays")} value={rows.reduce((s, r) => s + r.remote, 0)} hint={`${t("fieldDays")}: ${rows.reduce((s, r) => s + r.field, 0)}`} />
      </div>
      <Panel title={t("checkinRate")}>
        <HBars data={rows.map((r) => ({ name: r.name, value: Math.round((r.rate ?? 0) * 100) }))} label={`${t("checkinRate")} %`} />
      </Panel>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="text-muted-foreground border-b text-xs">
            <tr>
              {[t("person"), t("daysIn"), t("checkinRate"), t("avgArrival"), t("lateCount"), t("remoteDays"), t("fieldDays"), t("leaveTaken")].map((h) => (
                <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y tabular-nums">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.daysIn}</td>
                <td className="px-3 py-2">{pct(r.rate)}</td>
                <td className="px-3 py-2" dir="ltr">{r.avgArrival ?? "—"}</td>
                <td className="px-3 py-2">{r.late}</td>
                <td className="px-3 py-2">{r.remote}</td>
                <td className="px-3 py-2">{r.field}</td>
                <td className="px-3 py-2">{r.leaveUsed} / {r.leaveAllowance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
