import type { Database } from "@/lib/supabase/database.types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type PostStatus = Database["public"]["Enums"]["post_status"];
export type Pillar = Database["public"]["Enums"]["content_pillar"];
export type PostFormat = "feed" | "carousel" | "reel" | "story" | "text";

export const POST_STATUSES: PostStatus[] = ["draft", "in_review", "approved", "scheduled", "published"];
export const PILLARS: Pillar[] = ["awareness", "engagement", "insights", "offer", "community"];
export const FORMATS: PostFormat[] = ["feed", "carousel", "reel", "story", "text"];
export const POST_PLATFORMS = ["facebook", "instagram", "linkedin", "tiktok", "snapchat"] as const;

/** Caption limits per platform (characters). */
export const CAPTION_LIMITS: Record<string, number> = { instagram: 2200, tiktok: 2200, linkedin: 3000, facebook: 63206, snapchat: 250 };

export type PostMedia = Pick<Row<"post_media">, "id" | "attachment_id" | "storage_path" | "thumbnail_path" | "media_type" | "width" | "height" | "duration_seconds" | "position">;
export type Post = Omit<Row<"posts">, "created_at" | "updated_at"> & { media: PostMedia[] };
export type ReadyCard = { id: string; title: string; brand_id: string | null; board_id: string };

export const STATUS_DOT: Record<PostStatus, string> = {
  draft: "bg-slate-400",
  in_review: "bg-amber-500",
  approved: "bg-sky-500",
  scheduled: "bg-violet-500",
  published: "bg-emerald-500",
};
