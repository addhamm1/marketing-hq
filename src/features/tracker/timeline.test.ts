import { describe, expect, it } from "vitest";
import type { Stage } from "@/features/boards/types";
import { buildTimeline, lastMovedAt, type TimelineEvent } from "./timeline";

const at = (hour: number) => `2026-11-10T${String(hour).padStart(2, "0")}:00:00+00:00`;
const period = (stage: Stage, hour: number) => ({ stage, entered_at: at(hour) });
const event = (kind: string, hour: number, over: Partial<TimelineEvent> = {}): TimelineEvent => ({
  kind,
  from_stage: null,
  created_at: at(hour),
  decision: null,
  to: null,
  ...over,
});
const kinds = (periods: ReturnType<typeof period>[], events: TimelineEvent[] = []) =>
  buildTimeline({ periods, events }, at(1)).map((e) => e.kind);

describe("buildTimeline", () => {
  it("collapses internal stages into plain steps", () => {
    const periods = [
      period("request", 1),
      period("performance_input", 1),
      period("intake", 2),
      period("brief_schedule", 3),
      period("production", 4),
      period("creative_review", 5),
      period("confirmation", 6),
      period("ready_to_publish", 7),
      period("published", 8),
    ];
    expect(kinds(periods)).toEqual(["received", "in_review", "in_production", "confirmation", "delivered"]);
  });

  it("tells the story of a return and a resubmission", () => {
    const periods = [period("performance_input", 1), period("intake", 2), period("request", 3), period("performance_input", 4), period("intake", 5)];
    const events = [event("returned", 3), event("resubmitted", 4)];
    expect(kinds(periods, events)).toEqual(["received", "in_review", "returned", "resubmitted", "in_review_again"]);
  });

  it("shows the department's own decision and what follows it", () => {
    const periods = [period("production", 2), period("confirmation", 3), period("production", 4), period("confirmation", 5), period("ready_to_publish", 6)];
    const events = [
      event("approval", 4, { from_stage: "confirmation", decision: "changes_requested" }),
      event("approval", 6, { from_stage: "confirmation", decision: "approved" }),
    ];
    expect(kinds(periods, events)).toEqual([
      "received",
      "in_production",
      "confirmation",
      "changes_requested",
      "in_production_again",
      "confirmation",
      "confirmed",
      "delivered",
    ]);
  });

  it("keeps marketing's internal review and activity out", () => {
    const periods = [period("production", 2), period("creative_review", 3), period("production", 4)];
    const events = [
      event("approval", 4, { from_stage: "creative_review", decision: "changes_requested" }),
      event("revision", 4),
      event("assign", 2),
      event("comment", 3),
      event("update", 3),
    ];
    expect(kinds(periods, events)).toEqual(["received", "in_production"]);
  });

  it("reports a new delivery date", () => {
    const entries = buildTimeline({ periods: [], events: [event("due_change", 2, { to: "2026-12-01T10:00:00+00:00" })] }, at(1));
    expect(entries.at(-1)).toEqual({ kind: "date_changed", at: at(2), date: "2026-12-01T10:00:00+00:00" });
  });

  it("orders what lands in one transaction by what happened first", () => {
    const entries = buildTimeline(
      { periods: [period("ready_to_publish", 5)], events: [event("approval", 5, { from_stage: "confirmation", decision: "approved" })] },
      at(1),
    );
    expect(entries.map((e) => e.kind)).toEqual(["received", "confirmed", "delivered"]);
  });

  it("does not depend on the order rows arrive in", () => {
    expect(kinds([period("production", 4), period("intake", 2)])).toEqual(["received", "in_review", "in_production"]);
  });
});

describe("lastMovedAt", () => {
  it("is the latest stage change", () => {
    expect(lastMovedAt([{ entered_at: at(3) }, { entered_at: at(5) }, { entered_at: at(2) }], at(1))).toBe(at(5));
  });

  it("falls back to when the request was created", () => {
    expect(lastMovedAt([], at(1))).toBe(at(1));
  });
});
