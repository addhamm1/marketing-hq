import { addMonths, format } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { TeamCalendar } from "@/features/calendar/team-calendar";
import { monthGrid, overlaps, type Absence } from "@/features/calendar/month";
import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

export default async function CalendarPage({ searchParams }: PageProps<"/[locale]/calendar">) {
  const access = await requireAccess();
  const sp = await searchParams;
  const today = cairoDateString();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const grid = monthGrid(month);
  const locale = await getLocale();
  const t = await getTranslations("calendar");
  const supabase = await createClient();
  const [{ data: absences }, { data: profiles }, { data: teams }] = await Promise.all([
    supabase.rpc("team_absences", { p_from: grid[0].date, p_to: grid.at(-1)!.date }),
    supabase.from("profiles").select("id, team_id"),
    supabase.from("teams").select("id, name_en, name_ar"),
  ]);
  const teamOf = new Map((profiles ?? []).map((p) => [p.id, p.team_id]));
  const canSeeOverlaps = hasRole(access, "team_lead", "traffic_manager", "super_admin");
  const leadTeams = access.roles.filter((r) => r.role === "team_lead").map((r) => r.team_id);
  const warnings = canSeeOverlaps
    ? overlaps((absences ?? []) as Absence[], teamOf, grid.filter((c) => c.inMonth).map((c) => c.date)).filter(
        (w) => hasRole(access, "traffic_manager", "super_admin") || leadTeams.includes(w.teamId),
      )
    : [];
  const base = new Date(`${month}-15T12:00:00Z`);
  const monthLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(base);

  return (
    <div>
      <PageHeader title={t("title")} />
      <TeamCalendar
        month={month}
        monthLabel={monthLabel}
        prev={format(addMonths(base, -1), "yyyy-MM")}
        next={format(addMonths(base, 1), "yyyy-MM")}
        today={today}
        grid={grid}
        absences={(absences ?? []) as Absence[]}
        warnings={warnings}
        teamNames={Object.fromEntries((teams ?? []).map((tm) => [tm.id, locale === "ar" ? tm.name_ar : tm.name_en]))}
      />
    </div>
  );
}
