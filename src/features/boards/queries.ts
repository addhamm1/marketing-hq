import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { byPosition } from "@/lib/positions";
import type { BoardCard, BoardData, Brand, Person } from "./types";

type Client = SupabaseClient<Database>;

export const CARD_SELECT = `id, list_id, position, title, stage, priority, due_at, stage_due_at, stage_entered_at,
  brand_id, revision_count, request_kind, requesting_department_id, vertical, format, platforms,
  reviewer_id, approver_id, is_late_submission,
  card_assignees(user_id, role), card_labels(label_id), checklists(checklist_items(done)),
  comments(count), attachments(count)`;

type RawCard = Omit<BoardCard, "assignees" | "label_ids" | "checklist" | "comment_count" | "attachment_count"> & {
  card_assignees: BoardCard["assignees"];
  card_labels: { label_id: string }[];
  checklists: { checklist_items: { done: boolean }[] }[];
  comments: { count: number }[];
  attachments: { count: number }[];
};

export function toBoardCard(raw: RawCard): BoardCard {
  const items = raw.checklists.flatMap((c) => c.checklist_items);
  const { card_assignees, card_labels, checklists: _c, comments, attachments, ...rest } = raw;
  void _c;
  return {
    ...rest,
    assignees: card_assignees,
    label_ids: card_labels.map((l) => l.label_id),
    checklist: { done: items.filter((i) => i.done).length, total: items.length },
    comment_count: comments[0]?.count ?? 0,
    attachment_count: attachments[0]?.count ?? 0,
  };
}

/** Everything the board view needs. Works with server and browser clients (row policies apply). */
export async function fetchBoardData(client: Client, boardId: string): Promise<BoardData | null> {
  const [board, lists, cards, labels] = await Promise.all([
    client.from("boards").select("id, name, description, is_pipeline, visibility, workspace_id, created_by, archived_at").eq("id", boardId).maybeSingle(),
    client.from("lists").select("id, name, position, stage").eq("board_id", boardId).is("archived_at", null),
    client.from("cards").select(CARD_SELECT).eq("board_id", boardId).is("archived_at", null),
    client.from("labels").select("id, name, color").eq("board_id", boardId).order("name"),
  ]);
  if (board.error) throw board.error;
  if (!board.data) return null;
  if (lists.error) throw lists.error;
  if (cards.error) throw cards.error;
  return {
    board: board.data as BoardData["board"],
    lists: [...(lists.data ?? [])].sort(byPosition),
    cards: ((cards.data ?? []) as unknown as RawCard[]).map(toBoardCard).sort(byPosition),
    labels: labels.data ?? [],
  };
}

export async function fetchPeople(client: Client): Promise<Person[]> {
  const { data, error } = await client.rpc("public_profiles");
  if (error) throw error;
  return ((data ?? []) as Person[]).sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export async function fetchBrands(client: Client): Promise<Brand[]> {
  const { data } = await client.from("brands").select("id, name, slug, color").order("name");
  return data ?? [];
}

export type BoardSettings = { stageTargets: Partial<Record<string, number>>; wipLimit: number; verticals: string[]; formats: string[]; platforms: string[] };

export async function fetchBoardSettings(client: Client): Promise<BoardSettings> {
  const { data } = await client.from("settings").select("key, value").in("key", ["stage_targets_hours", "wip_limit", "verticals", "formats", "platforms"]);
  const get = (k: string) => data?.find((s) => s.key === k)?.value;
  return {
    stageTargets: (get("stage_targets_hours") as Record<string, number>) ?? {},
    wipLimit: Number(get("wip_limit") ?? 6),
    verticals: (get("verticals") as string[]) ?? [],
    formats: (get("formats") as string[]) ?? [],
    platforms: (get("platforms") as string[]) ?? [],
  };
}
