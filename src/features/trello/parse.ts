import { z } from "zod";

/** Minimal structure extracted from a Trello board export, sent to the server. */
export const importSchema = z.object({
  board_id: z.uuid(),
  lists: z.array(z.object({ ref: z.string().max(64), name: z.string().trim().min(1).max(80) })).max(100),
  labels: z.array(z.object({ ref: z.string().max(64), name: z.string().trim().max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(100),
  cards: z
    .array(
      z.object({
        list: z.string().max(64),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(20_000),
        due_at: z.string().nullable(),
        labels: z.array(z.string().max(64)).max(20),
        checklists: z.array(z.object({ title: z.string().trim().min(1).max(120), items: z.array(z.object({ text: z.string().trim().min(1).max(300), done: z.boolean() })).max(100) })).max(20),
        comments: z.array(z.object({ author: z.string().max(120), text: z.string().trim().min(1).max(5000), date: z.string().max(40) })).max(200),
        links: z.array(z.object({ name: z.string().trim().min(1).max(255), url: z.url().max(2000) })).max(50),
      }),
    )
    .max(2000),
});
export type TrelloImport = z.infer<typeof importSchema>;

const COLORS: Record<string, string> = {
  green: "#16A34A", yellow: "#CA8A04", orange: "#EA580C", red: "#DC2626", purple: "#7C3AED",
  blue: "#2563EB", sky: "#0284C7", lime: "#65A30D", pink: "#DB2777", black: "#334155",
};

type TrelloJson = {
  lists?: { id: string; name: string; closed?: boolean; pos?: number }[];
  cards?: { id: string; name: string; desc?: string; idList: string; closed?: boolean; due?: string | null; pos?: number; idLabels?: string[]; attachments?: { name?: string; url?: string }[] }[];
  labels?: { id: string; name?: string; color?: string | null }[];
  checklists?: { idCard: string; name: string; pos?: number; checkItems?: { name: string; state?: string; pos?: number }[] }[];
  actions?: { type: string; date?: string; data?: { text?: string; card?: { id?: string } }; memberCreator?: { fullName?: string } }[];
};

/** Parse a Trello export (closed lists and cards are skipped). Returns null if it is not a board export. */
export function parseTrello(raw: unknown, boardId: string): TrelloImport | null {
  const json = raw as TrelloJson;
  if (!json || !Array.isArray(json.lists) || !Array.isArray(json.cards)) return null;
  const byPos = <T extends { pos?: number }>(a: T, b: T) => (a.pos ?? 0) - (b.pos ?? 0);
  const lists = json.lists.filter((l) => !l.closed).sort(byPos);
  const listIds = new Set(lists.map((l) => l.id));
  const comments = new Map<string, { author: string; text: string; date: string }[]>();
  for (const a of json.actions ?? []) {
    const cardId = a.data?.card?.id;
    if (a.type !== "commentCard" || !cardId || !a.data?.text) continue;
    comments.set(cardId, [...(comments.get(cardId) ?? []), { author: a.memberCreator?.fullName ?? "", text: a.data.text.slice(0, 5000), date: a.date ?? "" }]);
  }
  return {
    board_id: boardId,
    lists: lists.map((l) => ({ ref: l.id, name: (l.name || "List").slice(0, 80) })),
    labels: (json.labels ?? []).map((l) => ({ ref: l.id, name: (l.name || l.color || "Label").slice(0, 40), color: COLORS[l.color ?? ""] ?? "#64748B" })),
    cards: json.cards
      .filter((c) => !c.closed && listIds.has(c.idList))
      .sort(byPos)
      .map((c) => ({
        list: c.idList,
        title: (c.name || "Untitled").slice(0, 200),
        description: (c.desc ?? "").slice(0, 20_000),
        due_at: c.due ?? null,
        labels: c.idLabels ?? [],
        checklists: (json.checklists ?? [])
          .filter((cl) => cl.idCard === c.id)
          .sort(byPos)
          .map((cl) => ({
            title: (cl.name || "Checklist").slice(0, 120),
            items: (cl.checkItems ?? []).sort(byPos).map((i) => ({ text: (i.name || "-").slice(0, 300), done: i.state === "complete" })),
          })),
        comments: (comments.get(c.id) ?? []).reverse(),
        links: (c.attachments ?? [])
          .filter((a) => a.url && /^https?:\/\//.test(a.url))
          .map((a) => ({ name: (a.name || a.url!).slice(0, 255), url: a.url! })),
      })),
  };
}
