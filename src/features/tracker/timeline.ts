import type { Stage } from "@/features/boards/types";
import { trackerStep, type TrackerStep } from "./progress";

export type TimelinePeriod = { stage: Stage; entered_at: string };
export type TimelineEvent = {
  kind: string;
  from_stage: Stage | null;
  created_at: string;
  decision: string | null;
  to: string | null;
};
export type CardTimeline = { periods: TimelinePeriod[]; events: TimelineEvent[] };

// Written in the order they happen when several land in the same transaction.
const KINDS = [
  "received",
  "returned",
  "resubmitted",
  "changes_requested",
  "confirmed",
  "in_review",
  "in_review_again",
  "in_production",
  "in_production_again",
  "confirmation",
  "delivered",
  "date_changed",
] as const;
export type TimelineKind = (typeof KINDS)[number];
export type TimelineEntry = { kind: TimelineKind; at: string; date?: string };

const AGAIN: Partial<Record<TrackerStep, TimelineKind>> = { in_review: "in_review_again", in_production: "in_production_again" };

function fromEvent(event: TimelineEvent): TimelineEntry | null {
  const at = event.created_at;
  if (event.kind === "returned") return { kind: "returned", at };
  if (event.kind === "resubmitted") return { kind: "resubmitted", at };
  if (event.kind === "due_change" && event.to) return { kind: "date_changed", at, date: event.to };
  // Marketing's own creative review stays internal: only the department's decision is shown.
  if (event.kind === "approval" && event.from_stage === "confirmation") {
    if (event.decision === "approved") return { kind: "confirmed", at };
    if (event.decision === "changes_requested") return { kind: "changes_requested", at };
  }
  return null;
}

/** A request's history in plain language, oldest first. */
export function buildTimeline({ periods, events }: CardTimeline, createdAt: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [{ kind: "received", at: createdAt }];
  const seen = new Set<TrackerStep>(["received"]);
  let previous: TrackerStep = "received";
  for (const period of [...periods].sort((a, b) => a.entered_at.localeCompare(b.entered_at))) {
    const step = trackerStep(period.stage);
    if (step === previous) continue;
    previous = step;
    // Going back to "received" only happens through a return, which has its own line.
    if (step === "received") continue;
    entries.push({ kind: (seen.has(step) && AGAIN[step]) || (step as TimelineKind), at: period.entered_at });
    seen.add(step);
  }
  for (const event of events) {
    const entry = fromEvent(event);
    if (entry) entries.push(entry);
  }
  const rank = (kind: TimelineKind) => KINDS.indexOf(kind);
  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || rank(a.kind) - rank(b.kind));
}

/** The last time the request changed stage. */
export function lastMovedAt(periods: readonly { entered_at: string }[], createdAt: string) {
  return periods.reduce((latest, p) => (new Date(p.entered_at) > new Date(latest) ? p.entered_at : latest), createdAt);
}
