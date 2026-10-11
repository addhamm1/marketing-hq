import { addDays } from "date-fns";
import { cairoDateString } from "@/lib/dates";

export type DueGroup = "overdue" | "today" | "thisWeek" | "later" | "noDate";
export const DUE_GROUPS: DueGroup[] = ["overdue", "today", "thisWeek", "later", "noDate"];

/** Bucket by due date in Cairo time (D2-05). */
export function dueGroup(dueAt: string | null, now = new Date()): DueGroup {
  if (!dueAt) return "noDate";
  const due = new Date(dueAt);
  if (due.getTime() < now.getTime()) return "overdue";
  const day = cairoDateString(due);
  const today = cairoDateString(now);
  if (day === today) return "today";
  if (day <= cairoDateString(addDays(now, 7))) return "thisWeek";
  return "later";
}

export function groupByDue<T extends { due_at: string | null }>(items: T[], now = new Date()) {
  const out: Record<DueGroup, T[]> = { overdue: [], today: [], thisWeek: [], later: [], noDate: [] };
  for (const item of items) out[dueGroup(item.due_at, now)].push(item);
  for (const g of DUE_GROUPS) out[g].sort((a, b) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9"));
  return out;
}
