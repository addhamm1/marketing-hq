import { describe, expect, it } from "vitest";
import { applyFilters, EMPTY_FILTERS } from "./filters";
import type { BoardCard } from "./types";

const card = (over: Partial<BoardCard>): BoardCard => ({
  id: Math.random().toString(), list_id: "l", position: "a0", title: "Card", stage: "production", priority: "normal",
  due_at: null, stage_due_at: null, stage_entered_at: null, brand_id: null, revision_count: 0, request_kind: null,
  requesting_department_id: null, vertical: null, format: null, platforms: [], reviewer_id: null, approver_id: null,
  is_late_submission: false, assignees: [], label_ids: [], checklist: { done: 0, total: 0 }, comment_count: 0,
  attachment_count: 0, ...over,
});

describe("applyFilters", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  const cards = [
    card({ title: "Reel", assignees: [{ user_id: "a", role: "video" }], brand_id: "b1", due_at: "2026-10-10T10:00:00Z" }),
    card({ title: "Static", assignees: [{ user_id: "b", role: "design" }], brand_id: "b1", due_at: "2026-10-14T10:00:00Z" }),
    card({ title: "Story", assignees: [{ user_id: "a", role: "design" }], brand_id: "b2", stage: "intake" }),
  ];

  it("combines filters", () => {
    expect(applyFilters(cards, { ...EMPTY_FILTERS, assignee: "a" }, now).map((c) => c.title)).toEqual(["Reel", "Story"]);
    expect(applyFilters(cards, { ...EMPTY_FILTERS, assignee: "a", brand: "b1" }, now).map((c) => c.title)).toEqual(["Reel"]);
    expect(applyFilters(cards, { ...EMPTY_FILTERS, assignee: "a", stage: "intake" }, now).map((c) => c.title)).toEqual(["Story"]);
  });

  it("filters by due date buckets", () => {
    expect(applyFilters(cards, { ...EMPTY_FILTERS, due: "overdue" }, now).map((c) => c.title)).toEqual(["Reel"]);
    expect(applyFilters(cards, { ...EMPTY_FILTERS, due: "week" }, now).map((c) => c.title)).toEqual(["Static"]);
    expect(applyFilters(cards, { ...EMPTY_FILTERS, due: "none" }, now).map((c) => c.title)).toEqual(["Story"]);
  });

  it("searches titles", () => {
    expect(applyFilters(cards, { ...EMPTY_FILTERS, q: "sta" }, now).map((c) => c.title)).toEqual(["Static"]);
  });
});
