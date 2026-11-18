import { Megaphone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { WeekQuery } from "./filters";
import { loadWeekBoard } from "./queries";
import { WeekBoard } from "./week-board";

/** Team week, shared by the team app (/week) and the department portal (/portal/week). */
export async function WeekView({ basePath, searchParams }: { basePath: "/week" | "/portal/week"; searchParams: Promise<WeekQuery> }) {
  const [query, access, locale, t] = await Promise.all([searchParams, requireAccess(), getLocale(), getTranslations("week")]);
  const data = await loadWeekBoard(await createClient(), access, query, locale);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {basePath === "/portal/week" ? (
        <section className="bg-accent mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
            <Megaphone className="text-primary-ink mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{t("ctaTitle")}</h2>
              <p className="text-accent-foreground/80 mt-0.5 text-sm">{t("ctaBody")}</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/portal/requests/new">{t("ctaButton")}</Link>
          </Button>
        </section>
      ) : null}
      <WeekBoard data={data} basePath={basePath} />
    </div>
  );
}
