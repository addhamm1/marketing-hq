import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Stage } from "@/features/boards/types";

type Client = SupabaseClient<Database>;

export type FormField = { name: string; type: string; label_en: string; label_ar: string; options?: string[] };

export type InboxItem =
  | {
      kind: "card";
      stepId: string;
      createdAt: string;
      card: { id: string; board_id: string; title: string; stage: Stage | null; due_at: string | null; description: string; revision_count: number; key_message: string | null };
      previews: { id: string; name: string; mime: string | null; url: string }[];
      links: { id: string; name: string; url: string }[];
    }
  | {
      kind: "request";
      stepId: string;
      createdAt: string;
      request: { id: string; requester_id: string; starts_on: string | null; ends_on: string | null; days: number | null; data: Record<string, unknown>; submitted_at: string };
      type: { key: string; name_en: string; name_ar: string; fields: FormField[] };
    };

/** Every active step assigned to the user, across requests and cards. */
export async function fetchInbox(supabase: Client, userId: string): Promise<InboxItem[]> {
  const { data: steps, error } = await supabase
    .from("approval_steps")
    .select("id, subject_type, subject_id, created_at")
    .eq("approver_id", userId)
    .eq("status", "active")
    .order("created_at");
  if (error) throw error;
  const cardIds = (steps ?? []).filter((s) => s.subject_type === "card").map((s) => s.subject_id);
  const requestIds = (steps ?? []).filter((s) => s.subject_type === "request").map((s) => s.subject_id);

  const [cards, requests] = await Promise.all([
    cardIds.length
      ? supabase.from("cards").select("id, board_id, title, stage, due_at, description, revision_count, key_message, attachments(id, kind, name, mime, url, storage_path)").in("id", cardIds)
      : Promise.resolve({ data: [] }),
    requestIds.length
      ? supabase.from("requests").select("id, requester_id, starts_on, ends_on, days, data, submitted_at, request_types(key, name_en, name_ar, form_schema)").in("id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  type RawCard = Extract<InboxItem, { kind: "card" }>["card"];
  type RawAttachment = { id: string; kind: string; name: string; mime: string | null; url: string | null; storage_path: string | null };
  const cardById = new Map(((cards.data ?? []) as (RawCard & { attachments: RawAttachment[] })[]).map((c) => [c.id, c]));

  const media = [...cardById.values()].flatMap((c) =>
    c.attachments.filter((a) => a.kind === "file" && a.storage_path && /^(image|video)\//.test(a.mime ?? "")),
  );
  const signed = media.length
    ? (await supabase.storage.from("card-attachments").createSignedUrls(media.map((m) => m.storage_path!), 600)).data ?? []
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  type RawRequest = { id: string; requester_id: string; starts_on: string | null; ends_on: string | null; days: number | null; data: Record<string, unknown>; submitted_at: string; request_types: { key: string; name_en: string; name_ar: string; form_schema: { fields?: FormField[] } } };
  const requestById = new Map(((requests.data ?? []) as unknown as RawRequest[]).map((r) => [r.id, r]));

  const items: InboxItem[] = [];
  for (const s of steps ?? []) {
    if (s.subject_type === "card") {
      const c = cardById.get(s.subject_id);
      if (!c) continue;
      const { attachments, ...card } = c;
      items.push({
        kind: "card",
        stepId: s.id,
        createdAt: s.created_at,
        card,
        previews: attachments
          .filter((a) => a.storage_path && urlByPath.has(a.storage_path))
          .map((a) => ({ id: a.id, name: a.name, mime: a.mime, url: urlByPath.get(a.storage_path!)! })),
        links: attachments.filter((a) => a.kind === "link" && a.url).map((a) => ({ id: a.id, name: a.name, url: a.url! })),
      });
    } else {
      const r = requestById.get(s.subject_id);
      if (!r) continue;
      const { request_types: t, ...request } = r;
      items.push({
        kind: "request",
        stepId: s.id,
        createdAt: s.created_at,
        request,
        type: { key: t.key, name_en: t.name_en, name_ar: t.name_ar, fields: t.form_schema.fields ?? [] },
      });
    }
  }
  return items;
}
