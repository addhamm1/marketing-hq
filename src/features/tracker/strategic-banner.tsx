import { CalendarClock, CheckCircle2, TriangleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { formatCairoDate } from "@/features/week/format";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { StrategicStatus } from "./queries";

/** How long the department has left to send next month's plan, and whether it already has. */
export async function StrategicBanner({ status }: { status: StrategicStatus }) {
  const t = await getTranslations("tracker.deadline");
  const locale = await getLocale();
  const month = formatCairoDate(status.forMonth, locale, { month: "long", year: "numeric" });
  const date = formatCairoDate(status.deadline, locale, { weekday: "long", day: "numeric", month: "long" });
  const { submitted, daysLeft } = status;
  const passed = daysLeft < 0;
  const soon = daysLeft <= 5;

  const title = submitted
    ? t("submittedTitle", { month })
    : passed
      ? t("passedTitle", { month })
      : daysLeft === 0
        ? t("todayTitle", { month })
        : t("daysLeftTitle", { days: daysLeft, month });
  const body = submitted ? t("submittedBody") : passed ? t("passedBody", { date }) : t("deadlineBody", { date });
  const Icon = submitted ? CheckCircle2 : passed || soon ? TriangleAlert : CalendarClock;

  return (
    <section
      data-testid="strategic-banner"
      className={cn(
        "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
        submitted ? "bg-card" : soon ? "border-warning/60 bg-warning/10" : "bg-accent border-transparent",
      )}
    >
      <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", submitted ? "text-success" : "text-primary-ink")} aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{body}</p>
        </div>
      </div>
      {submitted ? null : (
        <Button asChild size="sm">
          <Link href="/portal/requests/new">{t("submit")}</Link>
        </Button>
      )}
    </section>
  );
}
