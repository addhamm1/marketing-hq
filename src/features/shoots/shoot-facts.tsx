import { CalendarDays, Clock, ExternalLink, MapPin, UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { formatShootDate, shootMapLink, shortTime } from "./helpers";
import type { ShootPage } from "./queries";

function Fact({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="text-sm font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}

/** The shoot's date, times, place, producer, brief and backup plan. */
export async function ShootFacts({ shoot, producer }: { shoot: ShootPage["shoot"]; producer: string | null }) {
  const t = await getTranslations("shoots");
  const locale = await getLocale();
  const branch = shoot.branches;
  const place = shoot.location_name ?? (locale === "ar" ? branch?.name_ar : branch?.name_en) ?? "";
  const map = shootMapLink(shoot.location_url, branch);
  return (
    <div className="bg-card space-y-4 rounded-xl border p-4">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={CalendarDays} label={t("fields.date")}>{formatShootDate(shoot.shoot_on, locale)}</Fact>
        <Fact icon={Clock} label={t("fields.times")}>
          <span dir="ltr">{shortTime(shoot.call_time)}{shoot.wrap_time ? ` – ${shortTime(shoot.wrap_time)}` : ""}</span>
        </Fact>
        <Fact icon={MapPin} label={t("fields.place")}>
          {place}
          {map ? (
            <a href={map} target="_blank" rel="noopener noreferrer" className="text-primary-ink ms-2 inline-flex items-center gap-1 font-normal underline-offset-4 hover:underline">
              {t("openMap")} <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </Fact>
        <Fact icon={UserRound} label={t("fields.producer")}>{producer ?? t("noProducer")}</Fact>
      </dl>
      {shoot.brief ? (
        <div>
          <h2 className="text-muted-foreground text-xs">{t("fields.brief")}</h2>
          <p className="mt-1 text-sm break-words whitespace-pre-wrap">{shoot.brief}</p>
        </div>
      ) : null}
      {shoot.backup_plan ? (
        <div>
          <h2 className="text-muted-foreground text-xs">{t("fields.backupPlan")}</h2>
          <p className="mt-1 text-sm break-words whitespace-pre-wrap">{shoot.backup_plan}</p>
        </div>
      ) : null}
    </div>
  );
}
