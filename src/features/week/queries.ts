import type { SupabaseClient } from "@supabase/supabase-js";
import type { Access } from "@/lib/auth/access";
import { cairoDateString } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";
import { addDaysTo, currentWeekStart, weekDays } from "./days";
import { parseWeekFilters, type WeekFilters, type WeekQuery } from "./filters";
import { toWeekPeople, type TeamWeekRow, type WeekPerson } from "./people";
import { canPlanFor, canPlanForAnyone } from "./plan-rules";

type Client = SupabaseClient<Database>;

// PostgREST returns at most 1000 rows per request (config.toml, max_rows).
const PAGE = 1000;

async function fetchTeamWeek(client: Client, from: string, to: string, departmentId: string | null) {
  const rows: TeamWeekRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client
      .rpc("team_week", { p_from: from, p_to: to, ...(departmentId ? { p_department_id: departmentId } : {}) })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as TeamWeekRow[]));
    if ((data?.length ?? 0) < PAGE) return rows;
  }
}

export type WeekOption = { id: string; name: string };

export type WeekBoardData = {
  today: string;
  days: string[];
  filters: WeekFilters;
  marketingId: string | null;
  thisWeek: string;
  departments: WeekOption[];
  teams: (WeekOption & { departmentId: string })[];
  branches: (WeekOption & { active: boolean })[];
  me: WeekPerson | null;
  people: WeekPerson[];
  canCopy: boolean;
};

export async function loadWeekBoard(client: Client, access: Access, query: WeekQuery, locale: string): Promise<WeekBoardData> {
  const label = (r: { name_en: string; name_ar: string }) => (locale === "ar" ? r.name_ar : r.name_en);
  const [departments, teams, branches] = await Promise.all([
    client.from("departments").select("id, name_en, name_ar, is_marketing"),
    client.from("teams").select("id, name_en, name_ar, department_id"),
    client.from("branches").select("id, name_en, name_ar, is_active"),
  ]);
  const failed = departments.error ?? teams.error ?? branches.error;
  if (failed) throw failed;
  const departmentRows = departments.data ?? [];
  const teamRows = teams.data ?? [];
  const branchRows = branches.data ?? [];

  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, locale);
  const today = cairoDateString();
  const marketingId = departmentRows.find((d) => d.is_marketing)?.id ?? null;
  const filters = parseWeekFilters(query, {
    today,
    marketingId,
    departmentIds: departmentRows.map((d) => d.id),
    teams: teamRows,
  });
  const days = weekDays(filters.week);
  const branchNames = branchRows.map((b) => ({ id: b.id, name_en: b.name_en, name: label(b) }));
  const viewer = { userId: access.user_id, canEditAnyone: canPlanForAnyone(access) };

  const rows = await fetchTeamWeek(client, days[0], days[5], filters.departmentId);
  const everyone = toWeekPeople(rows, viewer, branchNames);
  let me = everyone.find((p) => p.isMe) ?? null;
  if (!me && canPlanFor(access, access.user_id)) {
    // Your own row stays on the board whichever department is being viewed.
    const own = await fetchTeamWeek(client, days[0], days[5], access.department_id);
    me = toWeekPeople(own.filter((r) => r.user_id === access.user_id), viewer, branchNames)[0] ?? null;
  }

  return {
    today,
    days,
    filters,
    marketingId,
    thisWeek: currentWeekStart(today),
    departments: departmentRows.map((d) => ({ id: d.id, name: label(d) })).sort(byName),
    teams: teamRows.map((t) => ({ id: t.id, name: label(t), departmentId: t.department_id })).sort(byName),
    branches: branchRows.map((b) => ({ id: b.id, name: label(b), active: b.is_active })).sort(byName),
    me,
    people: everyone.filter((p) => !p.isMe && (!filters.teamId || p.teamId === filters.teamId)),
    canCopy: !!me && addDaysTo(filters.week, 5) >= today,
  };
}
