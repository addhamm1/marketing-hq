import { daysBetween } from "./month";
import { OPEN_STATUSES, type GateItem } from "./types";

type SummaryItem = Pick<GateItem, "id" | "kind" | "status" | "due_on" | "position">;
type AgendaItem = SummaryItem & Pick<GateItem, "starts_on" | "template_id" | "name_en">;

export function isOpen(item: Pick<GateItem, "status">): boolean {
  return OPEN_STATUSES.includes(item.status);
}

/** Past its date and still open. Phases are windows of work, so only gates count. */
export function isOverdue(item: Pick<GateItem, "kind" | "status" | "due_on">, today: string): boolean {
  return item.kind !== "phase" && isOpen(item) && item.due_on < today;
}

export type GateSummary<T> = { done: number; total: number; next: T | null; daysLeft: number | null; overdue: T[] };

/** Skipped gates leave the total: nobody is expected to finish them. */
export function summarise<T extends SummaryItem>(items: T[], today: string): GateSummary<T> {
  const byDue = (a: T, b: T) => a.due_on.localeCompare(b.due_on) || a.position - b.position;
  const gates = items.filter((i) => i.kind !== "phase" && i.status !== "skipped");
  const open = gates.filter(isOpen).sort(byDue);
  const next = open.find((i) => i.due_on >= today) ?? null;
  return {
    done: gates.filter((i) => i.status === "done").length,
    total: gates.length,
    next,
    daysLeft: next ? daysBetween(today, next.due_on) : null,
    overdue: open.filter((i) => i.due_on < today),
  };
}

export type AgendaEntry<T> = { type: "item"; item: T } | { type: "series"; key: string; items: T[] };

/** A track's items by date, with the dates of a recurring item folded into one entry. */
export function agendaEntries<T extends AgendaItem>(items: T[]): AgendaEntry<T>[] {
  const sorted = [...items].sort(
    (a, b) => a.starts_on.localeCompare(b.starts_on) || a.due_on.localeCompare(b.due_on) || a.position - b.position,
  );
  const series = new Map<string, T[]>();
  for (const item of sorted) {
    if (item.kind !== "recurring") continue;
    const key = item.template_id ?? item.name_en;
    series.set(key, [...(series.get(key) ?? []), item]);
  }
  const entries: AgendaEntry<T>[] = [];
  const placed = new Set<string>();
  for (const item of sorted) {
    const key = item.template_id ?? item.name_en;
    if (item.kind !== "recurring" || (series.get(key)?.length ?? 0) < 2) {
      entries.push({ type: "item", item });
    } else if (!placed.has(key)) {
      placed.add(key);
      entries.push({ type: "series", key, items: series.get(key)! });
    }
  }
  return entries;
}
