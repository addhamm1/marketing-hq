"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/navigation";
import { addDaysTo } from "./days";
import { ALL, weekHref, type WeekFilters } from "./filters";
import { formatCairoDate } from "./format";
import type { WeekBoardData } from "./queries";

export function WeekToolbar({ data, basePath }: { data: WeekBoardData; basePath: string }) {
  const t = useTranslations("week");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { filters, marketingId, days, thisWeek } = data;
  const href = (next: Partial<WeekFilters>) => weekHref(basePath, { ...filters, ...next }, marketingId);
  const go = (next: Partial<WeekFilters>) => startTransition(() => router.push(href(next), { scroll: false }));
  const teams = data.teams.filter((team) => team.departmentId === filters.departmentId);
  const range = `${formatCairoDate(days[0], locale)} – ${formatCairoDate(days[5], locale, { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3" aria-busy={pending}>
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon" aria-label={t("previousWeek")}>
          <Link href={href({ week: addDaysTo(filters.week, -7) })} scroll={false}>
            <ChevronLeft className="rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
        <p className="min-w-36 px-1 text-center text-sm font-medium" aria-live="polite">{range}</p>
        <Button asChild variant="outline" size="icon" aria-label={t("nextWeek")}>
          <Link href={href({ week: addDaysTo(filters.week, 7) })} scroll={false}>
            <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
        {filters.week !== thisWeek ? (
          <Button asChild variant="ghost" size="sm" className="ms-1">
            <Link href={href({ week: thisWeek })} scroll={false}>{t("thisWeek")}</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Select
          value={filters.departmentId ?? ALL}
          onValueChange={(value) => go({ departmentId: value === ALL ? null : value, teamId: null })}
        >
          <SelectTrigger className="w-full min-w-0 sm:w-48" aria-label={t("department")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allDepartments")}</SelectItem>
            {data.departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.teamId ?? ALL}
          onValueChange={(value) => go({ teamId: value === ALL ? null : value })}
          disabled={!teams.length}
        >
          <SelectTrigger className="w-full min-w-0 sm:w-44" aria-label={t("team")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allTeams")}</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
