import { currentWeekStart, parseDay, weekStartOf } from "./days";

export type WeekFilters = { week: string; departmentId: string | null; teamId: string | null };
export type WeekQuery = Record<string, string | string[] | undefined>;

export const ALL = "all";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Read the page's search params, falling back to this week and the marketing department. */
export function parseWeekFilters(
  query: WeekQuery,
  context: {
    today: string;
    marketingId: string | null;
    departmentIds: readonly string[];
    teams: readonly { id: string; department_id: string }[];
  },
): WeekFilters {
  const day = parseDay(first(query.week));
  const rawDepartment = first(query.department);
  const departmentId =
    rawDepartment === ALL ? null : rawDepartment && context.departmentIds.includes(rawDepartment) ? rawDepartment : context.marketingId;
  const rawTeam = first(query.team);
  const team = context.teams.find((t) => t.id === rawTeam && (!departmentId || t.department_id === departmentId));
  return { week: day ? weekStartOf(day) : currentWeekStart(context.today), departmentId, teamId: team?.id ?? null };
}

/** Link to the same board with other filters. The marketing default stays out of the URL. */
export function weekHref(basePath: string, filters: WeekFilters, marketingId: string | null) {
  const params = new URLSearchParams({ week: filters.week });
  if (filters.departmentId === null) params.set("department", ALL);
  else if (filters.departmentId !== marketingId) params.set("department", filters.departmentId);
  if (filters.teamId) params.set("team", filters.teamId);
  return `${basePath}?${params.toString()}`;
}
