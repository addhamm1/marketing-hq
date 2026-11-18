import { hasRole, type Access, type AppRole } from "@/lib/auth/access";
import type { Database } from "@/lib/supabase/database.types";
import { addDaysTo, daysBetween, weekdayOf } from "./days";

export type PlanKind = Database["public"]["Enums"]["week_plan_kind"];
export type PlanEntry = { day: string; kind: PlanKind; branch_id: string | null; place: string | null };

/** Mirrors public.is_staff(): freelance guests and people with no role never plan. */
const STAFF_ROLES: AppRole[] = ["super_admin", "leadership", "team_lead", "traffic_manager", "member", "requester", "final_approver", "hr"];

export function canPlanForAnyone(access: Access) {
  return hasRole(access, "super_admin", "traffic_manager");
}

export function canPlanFor(access: Access, userId: string) {
  return hasRole(access, ...STAFF_ROLES) && (userId === access.user_id || canPlanForAnyone(access));
}

/** Today and later can change; past days are history. Friday is not on the plan. */
export function isPlannableDay(day: string, today: string) {
  return day >= today && weekdayOf(day) !== 5;
}

/**
 * The rows "copy last week" adds to the week opening on `week`. It fills upcoming
 * days only, keeps what is already planned, and skips branches that have closed.
 */
export function copyPlanRows(
  lastWeek: PlanEntry[],
  input: { week: string; today: string; plannedDays: ReadonlySet<string>; activeBranchIds: ReadonlySet<string> },
): PlanEntry[] {
  return lastWeek.flatMap((entry) => {
    const day = addDaysTo(entry.day, 7);
    const offset = daysBetween(input.week, day);
    if (offset < 0 || offset > 5 || !isPlannableDay(day, input.today) || input.plannedDays.has(day)) return [];
    if (entry.kind === "branch" && (!entry.branch_id || !input.activeBranchIds.has(entry.branch_id))) return [];
    return [{ ...entry, day }];
  });
}
