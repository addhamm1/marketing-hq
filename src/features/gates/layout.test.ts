import { describe, expect, it } from "vitest";
import { formatRange } from "./format";
import { layoutTrack, spanOf, spanStyle, splitName, todayPct, type LayoutItem } from "./layout";
import { clampDay, daysBetween, monthInfo, monthsApart, resolveMonth, shiftMonth, weekdayOf } from "./month";
import { agendaEntries, isOverdue, summarise } from "./summary";
import type { GateKind, GateStatus } from "./types";

const NOV = monthInfo("2026-11");
const FEB = monthInfo("2027-02");

let seq = 0;
const item = (kind: GateKind, starts_on: string, due_on = starts_on, position = 0): LayoutItem => ({
  id: `i${++seq}`, kind, starts_on, due_on, position,
});

describe("month arithmetic", () => {
  it("knows how long each month is", () => {
    expect(monthInfo("2026-11").days).toBe(30);
    expect(monthInfo("2026-12").days).toBe(31);
    expect(monthInfo("2027-02").days).toBe(28);
    expect(monthInfo("2028-02").days).toBe(29);
    expect(FEB.last).toBe("2027-02-28");
  });

  it("moves across year ends", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(monthsApart("2026-11", "2027-11")).toBe(12);
    expect(daysBetween("2026-11-30", "2026-12-02")).toBe(2);
  });

  it("falls back to this month for unusable values", () => {
    expect(resolveMonth("2027-03", "2026-11-18")).toBe("2027-03");
    expect(resolveMonth("2027-13", "2026-11-18")).toBe("2026-11");
    expect(resolveMonth("nonsense", "2026-11-18")).toBe("2026-11");
    expect(resolveMonth(undefined, "2026-11-18")).toBe("2026-11");
    expect(resolveMonth("2028-01", "2026-11-18")).toBe("2026-11");
  });

  it("uses the same weekday numbers as the templates", () => {
    expect(weekdayOf("2026-11-22")).toBe(0); // Sunday
    expect(weekdayOf("2026-11-20")).toBe(5); // Friday
  });
});

describe("bar position", () => {
  it("places a bar on a 30-day month", () => {
    const span = spanOf("2026-11-06", "2026-11-20", NOV);
    expect(span).toMatchObject({ startDay: 6, endDay: 20 });
    expect(span.startPct).toBeCloseTo((5 / 30) * 100);
    expect(span.sizePct).toBeCloseTo((15 / 30) * 100);
  });

  it("fills the whole of a 28-day month", () => {
    const span = spanOf("2027-02-01", "2027-02-28", FEB);
    expect(span.startPct).toBe(0);
    expect(span.sizePct).toBeCloseTo(100);
  });

  it("gives one day its share of a 28-day month", () => {
    expect(spanOf("2027-02-28", "2027-02-28", FEB).sizePct).toBeCloseTo(100 / 28);
    expect(spanOf("2027-02-28", "2027-02-28", FEB).startPct).toBeCloseTo((27 / 28) * 100);
  });

  it("holds a gate rolled back into the previous month at day 1", () => {
    // 1 January 2027 is a Friday, so a day-1 gate is due on 31 December.
    const jan = monthInfo("2027-01");
    expect(clampDay("2026-12-31", jan)).toBe(1);
    expect(spanOf("2026-12-31", "2026-12-31", jan)).toMatchObject({ startDay: 1, endDay: 1, startPct: 0 });
  });

  it("never gives a bar a negative length", () => {
    expect(spanOf("2026-11-20", "2026-10-02", NOV).sizePct).toBeGreaterThan(0);
  });

  it("uses logical properties so right-to-left mirrors the same numbers", () => {
    const style = spanStyle(spanOf("2026-11-06", "2026-11-20", NOV));
    expect(Object.keys(style).sort()).toEqual(["inlineSize", "insetInlineStart"]);
    expect(style).not.toHaveProperty("left");
    expect(style).not.toHaveProperty("right");
  });

  it("puts the today line in the middle of today's column, only in its month", () => {
    expect(todayPct("2026-11-01", NOV)).toBeCloseTo((0.5 / 30) * 100);
    expect(todayPct("2026-11-30", NOV)).toBeCloseTo((29.5 / 30) * 100);
    expect(todayPct("2026-12-01", NOV)).toBeNull();
  });
});

describe("track layout", () => {
  const contentTrack = () => [
    item("phase", "2026-11-01", "2026-11-04"),
    item("gate", "2026-11-05"),
    item("phase", "2026-11-06", "2026-11-20"),
    item("phase", "2026-11-21", "2026-11-24"),
    item("gate", "2026-11-25"),
    item("phase", "2026-11-26", "2026-11-30"),
  ];

  it("reads like the chart: one lane, production in black, gates in yellow", () => {
    const { lanes } = layoutTrack(contentTrack(), "content-social", NOV);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].marks.map((m) => m.tone)).toEqual(["stone", "gate", "emphasis", "stone", "gate", "stone"]);
  });

  it("keeps black for the production track only", () => {
    const { lanes } = layoutTrack(contentTrack(), "performance", NOV);
    expect(lanes[0].marks.map((m) => m.tone)).not.toContain("emphasis");
  });

  it("draws a lone full-month phase as the light bar", () => {
    const { lanes } = layoutTrack([item("phase", "2026-11-01", "2026-11-30")], "publishing", NOV);
    expect(lanes[0].marks[0].tone).toBe("light");
  });

  it("marks a day-1 gate as the launch marker", () => {
    const { lanes } = layoutTrack([item("gate", "2026-11-01"), item("phase", "2026-11-02", "2026-11-24")], "performance", NOV);
    expect(lanes[0].marks[0].tone).toBe("launch");
  });

  it("keeps recurring markers in their own lane", () => {
    const layout = layoutTrack([item("phase", "2026-11-02", "2026-11-24"), item("recurring", "2026-11-04"), item("recurring", "2026-11-08")], "performance", NOV);
    expect(layout.lanes).toHaveLength(1);
    expect(layout.recurring.map((m) => m.span.startDay)).toEqual([4, 8]);
  });

  it("moves overlapping items to a second lane", () => {
    const { lanes } = layoutTrack([item("phase", "2026-11-01", "2026-11-10"), item("phase", "2026-11-05", "2026-11-12")], "publishing", NOV);
    expect(lanes).toHaveLength(2);
  });

  it("stacks gate labels that would touch and keeps them inside the month", () => {
    const { lanes } = layoutTrack([item("gate", "2026-11-05"), item("gate", "2026-11-07"), item("gate", "2026-11-30")], "content-social", NOV);
    const labels = lanes[0].marks.map((m) => m.label!);
    expect(labels[0].row).toBe(0);
    expect(labels[1].row).toBe(1);
    expect(labels[2].row).toBe(0);
    expect(labels[2].align).toBe("end");
    expect(labels[2].startPct + labels[2].sizePct).toBeCloseTo(100);
    expect(lanes[0].labelRows).toBe(2);
  });

  it("aligns a label at the start of the month to the start", () => {
    const { lanes } = layoutTrack([item("gate", "2026-11-01")], "performance", NOV);
    expect(lanes[0].marks[0].label).toMatchObject({ align: "start", startPct: 0 });
  });

  it("splits a gate name at its colon", () => {
    expect(splitName("Gate 5: plan delivered")).toEqual({ head: "Gate 5", tail: "plan delivered" });
    expect(splitName("بوابة 5: تسليم الخطة")).toEqual({ head: "بوابة 5", tail: "تسليم الخطة" });
    expect(splitName("Needs")).toEqual({ head: "Needs", tail: "" });
  });
});

describe("summary", () => {
  const row = (id: string, kind: GateKind, due_on: string, status: GateStatus = "not_started") => ({
    id, kind, status, due_on, starts_on: due_on, position: 0, template_id: null as string | null, name_en: id,
  });

  it("counts gates, finds the next one and flags what is overdue", () => {
    const s = summarise([
      row("plan", "phase", "2026-11-04"),
      row("g5", "gate", "2026-11-05", "done"),
      row("late", "checkpoint", "2026-11-10"),
      row("skip", "recurring", "2026-11-11", "skipped"),
      row("g25", "gate", "2026-11-25"),
    ], "2026-11-18");
    expect(s.done).toBe(1);
    expect(s.total).toBe(3);
    expect(s.next?.id).toBe("g25");
    expect(s.daysLeft).toBe(7);
    expect(s.overdue.map((i) => i.id)).toEqual(["late"]);
  });

  it("counts a gate due today as next, not overdue", () => {
    const s = summarise([row("g", "gate", "2026-11-18")], "2026-11-18");
    expect(s.daysLeft).toBe(0);
    expect(s.overdue).toEqual([]);
  });

  it("does not call a finished or missed gate overdue, or a phase", () => {
    expect(isOverdue(row("a", "gate", "2026-11-01", "done"), "2026-11-18")).toBe(false);
    expect(isOverdue(row("b", "gate", "2026-11-01", "missed"), "2026-11-18")).toBe(false);
    expect(isOverdue(row("c", "phase", "2026-11-01"), "2026-11-18")).toBe(false);
    expect(isOverdue(row("d", "gate", "2026-11-01", "at_risk"), "2026-11-18")).toBe(true);
  });

  it("folds a recurring item's dates into one agenda entry at its first date", () => {
    const a = { ...row("r1", "recurring", "2026-11-04"), template_id: "t" };
    const b = { ...row("r2", "recurring", "2026-11-08"), template_id: "t" };
    const entries = agendaEntries([b, row("g", "gate", "2026-11-06"), a]);
    expect(entries.map((e) => e.type)).toEqual(["series", "item"]);
    expect(entries[0].type === "series" && entries[0].items.map((i) => i.id)).toEqual(["r1", "r2"]);
  });
});

describe("date ranges", () => {
  it("shortens ranges inside one month", () => {
    expect(formatRange("2026-11-05", "2026-11-05", "en")).toBe("5 Nov");
    expect(formatRange("2026-11-06", "2026-11-20", "en")).toBe("6–20 Nov");
    expect(formatRange("2026-11-28", "2026-12-02", "en")).toBe("28 Nov – 2 Dec");
  });

  it("keeps Western digits in Arabic", () => {
    expect(formatRange("2026-11-06", "2026-11-20", "ar")).toMatch(/^6–20 /);
  });
});
