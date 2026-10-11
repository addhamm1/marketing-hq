import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { byPosition } from "@/lib/positions";

type Client = SupabaseClient<Database>;
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type CardDetail = Row<"cards"> & {
  assignees: { user_id: string; role: Database["public"]["Enums"]["assignee_role"] }[];
  label_ids: string[];
  checklists: (Pick<Row<"checklists">, "id" | "title" | "position"> & {
    items: Pick<Row<"checklist_items">, "id" | "text" | "done" | "position" | "assignee_id" | "due_at">[];
  })[];
  comments: Pick<Row<"comments">, "id" | "author_id" | "body" | "mentions" | "edited_at" | "created_at">[];
  attachments: Pick<Row<"attachments">, "id" | "kind" | "name" | "mime" | "size" | "url" | "storage_path" | "uploaded_by" | "created_at">[];
  events: Pick<Row<"card_events">, "id" | "actor_id" | "kind" | "from_stage" | "to_stage" | "data" | "created_at">[];
  steps: Pick<Row<"approval_steps">, "id" | "approver_id" | "status" | "card_stage" | "step_index" | "comment" | "revision_reason" | "decided_at">[];
};

export async function fetchCardDetail(client: Client, cardId: string): Promise<CardDetail | null> {
  const [card, events, steps] = await Promise.all([
    client
      .from("cards")
      .select(
        `*, card_assignees(user_id, role), card_labels(label_id),
         checklists(id, title, position, checklist_items(id, text, done, position, assignee_id, due_at)),
         comments(id, author_id, body, mentions, edited_at, created_at),
         attachments(id, kind, name, mime, size, url, storage_path, uploaded_by, created_at)`,
      )
      .eq("id", cardId)
      .maybeSingle(),
    client
      .from("card_events")
      .select("id, actor_id, kind, from_stage, to_stage, data, created_at")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("approval_steps")
      .select("id, approver_id, status, card_stage, step_index, comment, revision_reason, decided_at")
      .eq("subject_type", "card")
      .eq("subject_id", cardId)
      .order("step_index"),
  ]);
  if (card.error) throw card.error;
  if (!card.data) return null;
  const raw = card.data as unknown as Row<"cards"> & {
    card_assignees: CardDetail["assignees"];
    card_labels: { label_id: string }[];
    checklists: (CardDetail["checklists"][number] & { checklist_items: CardDetail["checklists"][number]["items"] })[];
    comments: CardDetail["comments"];
    attachments: CardDetail["attachments"];
  };
  const { card_assignees, card_labels, checklists, comments, attachments, ...rest } = raw;
  return {
    ...rest,
    assignees: card_assignees,
    label_ids: card_labels.map((l) => l.label_id),
    checklists: checklists
      .map(({ checklist_items, ...c }) => ({ ...c, items: [...checklist_items].sort(byPosition) }))
      .sort(byPosition),
    comments: [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    attachments: [...attachments].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    events: events.data ?? [],
    steps: steps.data ?? [],
  };
}
