import { Clapperboard, Clock, MapPin, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/states/states";
import { Link } from "@/i18n/navigation";
import { formatShootDate, shortTime } from "./helpers";
import type { ShootListItem } from "./queries";
import { ShootStatusBadge } from "./status-badge";

async function Row({ shoot }: { shoot: ShootListItem }) {
  const t = await getTranslations("shoots");
  const locale = await getLocale();
  const place = shoot.location_name ?? (locale === "ar" ? shoot.branch?.name_ar : shoot.branch?.name_en) ?? "";
  return (
    <li>
      <Link href={`/shoots/${shoot.id}`} className="hover:bg-muted/40 flex flex-col gap-1.5 px-4 py-3 transition-colors">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 font-medium break-words">{shoot.title}</span>
          <ShootStatusBadge status={shoot.status} />
        </span>
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>{formatShootDate(shoot.shoot_on, locale, "short")}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            <span dir="ltr">{shortTime(shoot.call_time)}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{place}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {t("crewCount", { count: shoot.crew, confirmed: shoot.confirmed })}
          </span>
        </span>
      </Link>
    </li>
  );
}

export async function ShootList({ title, shoots, empty }: { title: string; shoots: ShootListItem[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {shoots.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {shoots.map((s) => <Row key={s.id} shoot={s} />)}
        </ul>
      ) : (
        <EmptyState title={empty} icon={<Clapperboard className="size-8" aria-hidden />} className="py-8" />
      )}
    </section>
  );
}
