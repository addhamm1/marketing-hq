import { clampDay, type MonthInfo } from "./month";
import type { GateItem } from "./types";

export type LayoutItem = Pick<GateItem, "id" | "kind" | "starts_on" | "due_on" | "position">;

export type Span = { startDay: number; endDay: number; startPct: number; sizePct: number };
export type Tone = "stone" | "light" | "emphasis" | "gate" | "launch" | "checkpoint" | "recurring";
export type LabelBox = { startPct: number; sizePct: number; align: "start" | "center" | "end"; row: number };
export type Mark<T extends LayoutItem> = { item: T; span: Span; tone: Tone; label: LabelBox | null };
export type Lane<T extends LayoutItem> = { marks: Mark<T>[]; labelRows: number };
export type TrackLayout<T extends LayoutItem> = { lanes: Lane<T>[]; recurring: Mark<T>[] };

/** The track whose longest phase is the month's main production window. */
const PRODUCTION_TRACK = "content-social";
/** How many day columns a label under a gate may use. */
export const LABEL_DAYS = 8;

/** Where an item sits on the month, as a share of its width from the inline start. */
export function spanOf(startsOn: string, dueOn: string, info: MonthInfo): Span {
  const startDay = clampDay(startsOn, info);
  const endDay = Math.max(startDay, clampDay(dueOn, info));
  return {
    startDay,
    endDay,
    startPct: ((startDay - 1) / info.days) * 100,
    sizePct: ((endDay - startDay + 1) / info.days) * 100,
  };
}

/** Logical properties only, so the same numbers mirror in right-to-left. */
export function spanStyle(span: Pick<Span, "startPct" | "sizePct">) {
  return { insetInlineStart: `${span.startPct}%`, inlineSize: `${span.sizePct}%` };
}

/** The centre of today's column, or null when today is in another month. */
export function todayPct(today: string, info: MonthInfo): number | null {
  if (today < info.first || today > info.last) return null;
  return ((clampDay(today, info) - 0.5) / info.days) * 100;
}

/** "Gate 5: plan delivered" becomes a short head and the words after the colon. */
export function splitName(name: string): { head: string; tail: string } {
  const at = name.indexOf(":");
  if (at < 1) return { head: name.trim(), tail: "" };
  return { head: name.slice(0, at).trim(), tail: name.slice(at + 1).trim() };
}

function labelBox(day: number, days: number): Omit<LabelBox, "row"> {
  const width = Math.min(LABEL_DAYS, days);
  const ideal = day - 0.5 - width / 2;
  const start = Math.min(Math.max(ideal, 0), days - width);
  const align = start === 0 && ideal < 0 ? "start" : start === days - width && ideal > start ? "end" : "center";
  return { startPct: (start / days) * 100, sizePct: (width / days) * 100, align };
}

function toneOf<T extends LayoutItem>(item: T, span: Span, phases: T[], emphasisId: string | null, markers: number): Tone {
  if (item.kind === "recurring") return "recurring";
  if (item.kind === "checkpoint") return "checkpoint";
  if (item.kind === "gate") return span.startDay === 1 ? "launch" : "gate";
  if (item.id === emphasisId) return "emphasis";
  return phases.length === 1 && markers === 0 ? "light" : "stone";
}

function longestPhase<T extends LayoutItem>(phases: T[], info: MonthInfo): string | null {
  let best: { id: string; size: number } | null = null;
  for (const p of phases) {
    const { sizePct } = spanOf(p.starts_on, p.due_on, info);
    if (!best || sizePct > best.size) best = { id: p.id, size: sizePct };
  }
  return best?.id ?? null;
}

/** Stacks labels that would touch: each one takes the first free row. */
function placeLabels<T extends LayoutItem>(marks: Mark<T>[], days: number): number {
  const rowEnds: number[] = [];
  for (const mark of marks) {
    if (!mark.label) continue;
    const start = (mark.label.startPct / 100) * days;
    let row = rowEnds.findIndex((end) => end <= start + 1e-6);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = start + (mark.label.sizePct / 100) * days;
    mark.label.row = row;
  }
  return rowEnds.length;
}

/** Sorts a track's items into lanes so that nothing overlaps. */
export function layoutTrack<T extends LayoutItem>(items: T[], trackKey: string, info: MonthInfo): TrackLayout<T> {
  const phases = items.filter((i) => i.kind === "phase");
  const markers = items.filter((i) => i.kind === "gate" || i.kind === "checkpoint").length;
  const emphasisId = trackKey === PRODUCTION_TRACK ? longestPhase(phases, info) : null;

  const marks = items.map((item): Mark<T> => {
    const span = spanOf(item.starts_on, item.due_on, info);
    const label = item.kind === "gate" ? { ...labelBox(span.startDay, info.days), row: 0 } : null;
    return { item, span, tone: toneOf(item, span, phases, emphasisId, markers), label };
  });
  const byDay = (a: Mark<T>, b: Mark<T>) =>
    a.span.startDay - b.span.startDay || b.span.endDay - a.span.endDay || a.item.position - b.item.position;

  const recurring = marks.filter((m) => m.tone === "recurring").sort(byDay);
  const laneEnds: number[] = [];
  const laneMarks: Mark<T>[][] = [];
  for (const mark of marks.filter((m) => m.tone !== "recurring").sort(byDay)) {
    let lane = laneEnds.findIndex((end) => end < mark.span.startDay);
    if (lane === -1) {
      lane = laneEnds.length;
      laneMarks.push([]);
    }
    laneEnds[lane] = mark.span.endDay;
    laneMarks[lane].push(mark);
  }
  return { lanes: laneMarks.map((m) => ({ marks: m, labelRows: placeLabels(m, info.days) })), recurring };
}
