import { AlertTriangle, CircleCheck, CircleDashed, LogOut } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { clock, pick } from "./format";
import type { CheckinState } from "./types";

/** Where the person stands today, with one tap to the check-in screen. */
export async function CheckinStrip({ state }: { state: CheckinState | null }) {
  const t = await getTranslations("myDay.checkin");
  const locale = await getLocale();

  if (!state) {
    return (
      <div role="alert" className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
        <AlertTriangle className="text-destructive size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">{t("failed")}</span>
        <Button asChild size="sm" variant="outline">
          <Link href="/checkin">{t("open")}</Link>
        </Button>
      </div>
    );
  }

  const time = state.at ? clock(state.at) : "";
  const place = state.place ? pick(state.place, locale) : null;
  const view = {
    in: { Icon: CircleCheck, tone: "text-success", label: place ? t("inAt", { place, time }) : t("in", { time }) },
    out: { Icon: LogOut, tone: "text-muted-foreground", label: t("out", { time }) },
    none: { Icon: CircleDashed, tone: "text-primary-ink", label: t("none") },
  }[state.status];

  return (
    <div className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3" data-testid="checkin-strip">
      <view.Icon className={`size-5 shrink-0 ${view.tone}`} aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-medium">{view.label}</p>
      <Button asChild size="sm" variant={state.status === "none" ? "default" : "outline"} className="shrink-0">
        <Link href="/checkin">{state.status === "none" ? t("open") : t("manage")}</Link>
      </Button>
    </div>
  );
}
