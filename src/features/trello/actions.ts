"use server";

import { getTranslations } from "next-intl/server";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { keyBetween } from "@/lib/positions";
import { createClient } from "@/lib/supabase/server";
import { importSchema } from "./parse";

/** Import a parsed Trello export into a free-form board (never the pipeline). */
export async function importTrello(input: unknown): Promise<ActionResult<{ cards: number }>> {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !hasRole(access, "super_admin")) return fail("common.notAllowed");
  const t = await getTranslations("trello");
  const supabase = await createClient();
  const v = parsed.data;

  const { data: board } = await supabase.from("boards").select("id, is_pipeline").eq("id", v.board_id).single();
  if (!board || board.is_pipeline) return fail("common.notAllowed");
  const { data: existing } = await supabase.from("lists").select("position").eq("board_id", v.board_id).order("position", { ascending: false }).limit(1);

  // Lists
  let pos = existing?.[0]?.position ?? null;
  const listId = new Map<string, string>();
  for (const l of v.lists) {
    pos = keyBetween(pos, null);
    const { data, error } = await supabase.from("lists").insert({ board_id: v.board_id, name: l.name, position: pos }).select("id").single();
    if (error || !data) return fail("common.unknownError");
    listId.set(l.ref, data.id);
  }

  // Labels: reuse by name on the board
  const { data: boardLabels } = await supabase.from("labels").select("id, name").eq("board_id", v.board_id);
  const labelId = new Map<string, string>();
  for (const l of v.labels) {
    const match = boardLabels?.find((b) => b.name.toLowerCase() === l.name.toLowerCase());
    if (match) labelId.set(l.ref, match.id);
    else {
      const { data } = await supabase.from("labels").insert({ board_id: v.board_id, name: l.name, color: l.color }).select("id").single();
      if (data) labelId.set(l.ref, data.id);
    }
  }

  // Cards
  const lastPos = new Map<string, string | null>();
  let count = 0;
  for (const c of v.cards) {
    const list = listId.get(c.list);
    if (!list) continue;
    const position = keyBetween(lastPos.get(list) ?? null, null);
    lastPos.set(list, position);
    const due = c.due_at && !Number.isNaN(Date.parse(c.due_at)) ? new Date(c.due_at).toISOString() : null;
    const { data: card, error } = await supabase
      .from("cards")
      .insert({ board_id: v.board_id, list_id: list, position, title: c.title, description: c.description, due_at: due, created_by: access.user_id })
      .select("id")
      .single();
    if (error || !card) continue;
    count++;
    const labels = c.labels.map((l) => labelId.get(l)).filter(Boolean) as string[];
    if (labels.length) await supabase.from("card_labels").insert(labels.map((label_id) => ({ card_id: card.id, label_id })));
    for (const cl of c.checklists) {
      const { data: list } = await supabase.from("checklists").insert({ card_id: card.id, title: cl.title }).select("id").single();
      if (!list) continue;
      let p: string | null = null;
      const items = cl.items.map((i) => {
        p = keyBetween(p, null);
        return { checklist_id: list.id, text: i.text, done: i.done, position: p };
      });
      if (items.length) await supabase.from("checklist_items").insert(items);
    }
    if (c.comments.length) {
      await supabase.from("comments").insert(
        c.comments.map((m) => ({ card_id: card.id, author_id: access.user_id, body: `${t("originalAuthor", { name: m.author || "?" })}${m.date ? ` (${m.date.slice(0, 10)})` : ""}\n\n${m.text}`.slice(0, 5000) })),
      );
    }
    if (c.links.length) {
      await supabase.from("attachments").insert(c.links.map((l) => ({ card_id: card.id, uploaded_by: access.user_id, kind: "link", url: l.url, name: l.name })));
    }
  }
  return ok({ cards: count });
}
