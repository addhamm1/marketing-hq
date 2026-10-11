import { addDays, endOfDay } from "date-fns";
import type { BoardCard } from "./types";

export type CardFilters = {
  q: string;
  assignee: string;
  stage: string;
  brand: string;
  department: string;
  due: "all" | "overdue" | "week" | "none";
};

export const EMPTY_FILTERS: CardFilters = { q: "", assignee: "all", stage: "all", brand: "all", department: "all", due: "all" };

export function isFiltered(f: CardFilters) {
  return f.q !== "" || f.assignee !== "all" || f.stage !== "all" || f.brand !== "all" || f.department !== "all" || f.due !== "all";
}

/** Filters combine with AND (D2-05). */
export function applyFilters(cards: BoardCard[], f: CardFilters, now = new Date()): BoardCard[] {
  const q = f.q.trim().toLowerCase();
  const weekEnd = endOfDay(addDays(now, 7)).getTime();
  return cards.filter((c) => {
    if (q && !c.title.toLowerCase().includes(q)) return false;
    if (f.assignee !== "all" && !c.assignees.some((a) => a.user_id === f.assignee)) return false;
    if (f.stage !== "all" && c.stage !== f.stage) return false;
    if (f.brand !== "all" && c.brand_id !== f.brand) return false;
    if (f.department !== "all" && c.requesting_department_id !== f.department) return false;
    if (f.due === "none" && c.due_at) return false;
    if (f.due === "overdue" && !(c.due_at && Date.parse(c.due_at) < now.getTime())) return false;
    if (f.due === "week" && !(c.due_at && Date.parse(c.due_at) >= now.getTime() && Date.parse(c.due_at) <= weekEnd)) return false;
    return true;
  });
}
