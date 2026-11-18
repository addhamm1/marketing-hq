import { ArrowUpRight, CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/i18n/navigation";
import type { CheckRow, CheckStatus } from "./checks";

const STATUS = {
  ready: { icon: CircleCheck, variant: "secondary", tone: "text-success" },
  review: { icon: TriangleAlert, variant: "outline", tone: "text-primary-ink" },
  blocked: { icon: OctagonAlert, variant: "destructive", tone: "text-destructive" },
} as const satisfies Record<CheckStatus, unknown>;

async function Row({ row }: { row: CheckRow }) {
  const t = await getTranslations("launch");
  const { icon: Icon, variant, tone } = STATUS[row.status];
  const detail = row.status === "ready"
    ? t(`checks.${row.id}.ok`, { holders: row.holders ?? 0 })
    : t(`checks.${row.id}.issue`, { count: row.count });
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3" data-testid={`check-${row.id}`} data-status={row.status}>
      <Icon className={`size-5 shrink-0 ${tone}`} aria-hidden />
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-medium">{t(`checks.${row.id}.title`)}</p>
        <p className="text-muted-foreground text-sm">{detail}</p>
      </div>
      <div className="ms-8 flex items-center gap-2 sm:ms-0">
        <span className="min-w-6 text-end text-sm font-semibold tabular-nums" aria-label={t("countLabel", { count: row.count })}>{row.count}</span>
        <Badge variant={variant}>{t(`status.${row.status}`)}</Badge>
        {row.href && row.status !== "ready" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={row.href}>{t("fix")} <ArrowUpRight className="rtl:-scale-x-100" aria-hidden /></Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export async function LaunchChecklist({ rows }: { rows: CheckRow[] }) {
  const t = await getTranslations("launch");
  const ready = rows.filter((r) => r.status === "ready").length;
  const blocked = rows.filter((r) => r.status === "blocked").length;
  const order: CheckStatus[] = ["blocked", "review", "ready"];
  const sorted = [...rows].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="bg-card space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("summary", { ready, total: rows.length })} {blocked ? t("summaryBlocked", { count: blocked }) : t("summaryClear")}</p>
        <Progress value={(ready / rows.length) * 100} aria-label={t("title")} />
      </div>
      <ul className="bg-card divide-y rounded-xl border">
        {sorted.map((r) => <Row key={r.id} row={r} />)}
      </ul>
    </div>
  );
}
