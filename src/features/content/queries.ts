import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { byPosition } from "@/lib/positions";
import type { Post, ReadyCard } from "./types";

type Client = SupabaseClient<Database>;

const POST_SELECT = `id, brand_id, card_id, branch_id, platforms, scheduled_at, format, caption_ar, caption_en, hashtags,
  first_comment, pillar, notes, status, owner_id, publisher_id, approved_by, review_comment, reminded_for,
  overdue_notified_at, published_at, published_links,
  post_media(id, attachment_id, storage_path, thumbnail_path, media_type, width, height, duration_seconds, position)`;

type Raw = Omit<Post, "media"> & { post_media: Post["media"] };
const toPost = ({ post_media, ...p }: Raw): Post => ({ ...p, media: [...post_media].sort(byPosition) });

/** Posts scheduled (or published) between two instants, plus unscheduled ones. */
export async function fetchPosts(client: Client, fromIso: string, toIso: string): Promise<Post[]> {
  const [dated, undated] = await Promise.all([
    client.from("posts").select(POST_SELECT).gte("scheduled_at", fromIso).lt("scheduled_at", toIso).order("scheduled_at"),
    client.from("posts").select(POST_SELECT).is("scheduled_at", null).order("created_at", { ascending: false }).limit(50),
  ]);
  if (dated.error) throw dated.error;
  return [...((dated.data ?? []) as unknown as Raw[]), ...((undated.data ?? []) as unknown as Raw[])].map(toPost);
}

export async function fetchPost(client: Client, id: string): Promise<Post | null> {
  const { data, error } = await client.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toPost(data as unknown as Raw) : null;
}

/** Cards ready to publish that have no post yet. */
export async function fetchReadyCards(client: Client): Promise<ReadyCard[]> {
  const [{ data: cards }, { data: linked }] = await Promise.all([
    client.from("cards").select("id, title, brand_id, board_id").eq("stage", "ready_to_publish").is("archived_at", null).order("delivered_at"),
    client.from("posts").select("card_id").not("card_id", "is", null),
  ]);
  const taken = new Set((linked ?? []).map((p) => p.card_id));
  return (cards ?? []).filter((c) => !taken.has(c.id));
}
