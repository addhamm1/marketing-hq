import { addDays, endOfMonth, format, startOfMonth } from "date-fns";

export type Absence = { user_id: string; category: "leave" | "wfh" | "field"; starts_on: string; ends_on: string };

/** Month grid starting on Saturday (the work week is Saturday to Thursday). */
export function monthGrid(month: string): { date: string; inMonth: boolean }[] {
  const first = startOfMonth(new Date(`${month}-01T12:00:00Z`));
  const last = endOfMonth(first);
  const lead = (first.getDay() + 1) % 7; // days since Saturday (date-fns works in local time)
  const start = addDays(first, -lead);
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let d = start; cells.length < 42; d = addDays(d, 1)) {
    const date = format(d, "yyyy-MM-dd");
    cells.push({ date, inMonth: d >= first && d <= last });
    if (cells.length % 7 === 0 && d >= last) break;
  }
  return cells;
}

export function absencesOn(date: string, absences: Absence[]) {
  return absences.filter((a) => a.starts_on <= date && a.ends_on >= date);
}

/** Days where two or more people from the same team are on leave (D5-05). */
export function overlaps(absences: Absence[], teamOf: Map<string, string | null>, days: string[]) {
  const out: { date: string; teamId: string; userIds: string[] }[] = [];
  for (const date of days) {
    const byTeam = new Map<string, Set<string>>();
    for (const a of absencesOn(date, absences)) {
      if (a.category !== "leave") continue;
      const team = teamOf.get(a.user_id);
      if (!team) continue;
      byTeam.set(team, (byTeam.get(team) ?? new Set()).add(a.user_id));
    }
    for (const [teamId, users] of byTeam) if (users.size >= 2) out.push({ date, teamId, userIds: [...users] });
  }
  return out;
}
