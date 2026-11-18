import { AlertCircle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cairoHour } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { dayPart, longDate } from "./format";
import type { MyDay } from "./types";

/** Greeting, date and a one-line count of what the day holds. */
export async function BriefingHeader({ name, day, now }: { name: string; day: MyDay; now: Date }) {
  const t = await getTranslations("myDay");
  const locale = await getLocale();
  const overdue = day.cards.items.filter((c) => c.overdue).length;
  const dueToday = day.cards.items.length - overdue;
  const glance = [
    { id: "cards", count: overdue, label: t("glance.overdue", { count: overdue }), late: true },
    { id: "meetings", count: day.meetings.items.length, label: t("glance.meetings", { count: day.meetings.items.length }) },
    { id: "cards", count: dueToday, label: t("glance.dueToday", { count: dueToday }) },
    { id: "approvals", count: day.approvals.items.length, label: t("glance.approvals", { count: day.approvals.items.length }) },
    { id: "gates", count: day.gates.items.length, label: t("glance.gates", { count: day.gates.items.length }) },
    { id: "shoots", count: day.shoots.items.length, label: t("glance.shoots", { count: day.shoots.items.length }) },
    { id: "actions", count: day.actions.items.length, label: t("glance.actions", { count: day.actions.items.length }) },
  ].filter((g) => g.count > 0);

  return (
    <header>
      <p className="text-muted-foreground text-sm">{longDate(now, locale)}</p>
      <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-balance">
        {t(`greeting.${dayPart(cairoHour(now))}`, { name })}
      </h1>
      {glance.length ? (
        <nav aria-label={t("glance.label")} className="mt-3 flex flex-wrap gap-1.5">
          {glance.map((g) => (
            <a
              key={g.label}
              href={`#${g.id}`}
              className={cn(
                "inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium",
                g.late ? "border-destructive/40 bg-destructive/5 text-destructive" : "bg-card hover:bg-muted/50",
              )}
            >
              {g.late ? <AlertCircle className="size-3.5" aria-hidden /> : null}
              {g.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
