import { describe, expect, it } from "vitest";
import { importSchema, parseTrello } from "./parse";

const sample = {
  lists: [{ id: "l1", name: "To do", pos: 1 }, { id: "l2", name: "Old", closed: true, pos: 2 }],
  labels: [{ id: "lb1", name: "Video", color: "purple" }],
  cards: [
    { id: "c1", name: "Reel", desc: "Shoot", idList: "l1", idLabels: ["lb1"], pos: 2, attachments: [{ name: "Ref", url: "https://example.com/x" }] },
    { id: "c2", name: "Archived", idList: "l1", closed: true },
    { id: "c3", name: "In closed list", idList: "l2" },
  ],
  checklists: [{ idCard: "c1", name: "Steps", checkItems: [{ name: "Script", state: "complete" }, { name: "Edit", state: "incomplete" }] }],
  actions: [{ type: "commentCard", date: "2026-01-01", data: { text: "Nice", card: { id: "c1" } }, memberCreator: { fullName: "Ali" } }],
};

describe("parseTrello", () => {
  it("extracts open lists and cards with checklists, comments, labels and links", () => {
    const r = parseTrello(sample, "00000000-0000-4000-8000-000000000001")!;
    expect(r.lists.map((l) => l.name)).toEqual(["To do"]);
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]).toMatchObject({ title: "Reel", labels: ["lb1"], comments: [{ author: "Ali", text: "Nice" }], links: [{ name: "Ref" }] });
    expect(r.cards[0].checklists[0].items).toEqual([{ text: "Script", done: true }, { text: "Edit", done: false }]);
    expect(importSchema.safeParse(r).success).toBe(true);
  });

  it("rejects files that are not board exports", () => {
    expect(parseTrello({ foo: 1 }, "x")).toBeNull();
  });
});
