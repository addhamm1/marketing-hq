import type { Database } from "@/lib/supabase/database.types";

type Nullable = "title" | "department_id" | "team_id" | "branch_id" | "place";
type GeneratedRow = Database["public"]["Functions"]["team_week"]["Returns"][number];
/** The generated type marks every column as required; these can be null. */
export type TeamWeekRow = Omit<GeneratedRow, Nullable> & { [K in Nullable]: string | null };
export type WeekKind = "branch" | "field" | "shoot" | "home" | "away" | "off" | "unknown";

/** What a cell may show. Why someone is away never reaches the browser. */
export type WeekCell = {
  kind: WeekKind;
  branchId: string | null;
  place: string | null;
  /** The person's own plan is what this cell shows, so it can be cleared. */
  planned: boolean;
  /** A check-in, approved request or shoot outranks the plan. Only set for rows the viewer can edit. */
  locked: boolean;
};

export type WeekPerson = {
  id: string;
  name: string;
  title: string | null;
  teamId: string | null;
  isMe: boolean;
  canEdit: boolean;
  days: Record<string, WeekCell>;
};

const KINDS: readonly string[] = ["branch", "field", "shoot", "home", "away", "off", "unknown"];
const OUTRANKS_PLAN: readonly string[] = ["checkin", "leave", "wfh", "shoot"];

type BranchName = { id: string; name_en: string; name: string };

function toCell(row: TeamWeekRow, canEdit: boolean, branches: ReadonlyMap<string, BranchName>): WeekCell {
  const kind = (KINDS.includes(row.kind) ? row.kind : "unknown") as WeekKind;
  const branch = row.branch_id ? branches.get(row.branch_id) : undefined;
  const hasPlace = kind === "field" || kind === "shoot";
  // A shoot at a branch arrives with the English branch name as its place.
  const place = hasPlace ? (branch && row.place === branch.name_en ? branch.name : row.place) : null;
  return {
    kind,
    branchId: kind === "branch" || kind === "shoot" ? row.branch_id : null,
    place: place || null,
    planned: canEdit && row.source === "plan",
    locked: canEdit && OUTRANKS_PLAN.includes(row.source),
  };
}

/** One entry per person, in the order team_week returned them. */
export function toWeekPeople(
  rows: TeamWeekRow[],
  viewer: { userId: string; canEditAnyone: boolean },
  branches: readonly BranchName[] = [],
): WeekPerson[] {
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const people = new Map<string, WeekPerson>();
  for (const row of rows) {
    const canEdit = viewer.canEditAnyone || row.user_id === viewer.userId;
    let person = people.get(row.user_id);
    if (!person) {
      person = {
        id: row.user_id,
        name: row.display_name,
        title: row.title,
        teamId: row.team_id,
        isMe: row.user_id === viewer.userId,
        canEdit,
        days: {},
      };
      people.set(row.user_id, person);
    }
    person.days[row.day] = toCell(row, canEdit, branchById);
  }
  return [...people.values()];
}
