"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser";
import type { PostMedia } from "./types";

/** Media from a card lives in card-attachments; uploaded media in post-media. */
export const bucketOf = (m: Pick<PostMedia, "attachment_id">) => (m.attachment_id ? "card-attachments" : "post-media");

/** Signed URLs (10 minutes) for originals and thumbnails, batched per bucket. */
export function useMediaUrls(media: PostMedia[]) {
  const key = media.map((m) => m.id).join(",");
  return useQuery({
    queryKey: ["media-urls", key],
    enabled: media.length > 0,
    staleTime: 8 * 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const out: Record<string, { url?: string; thumb?: string }> = {};
      const groups: Record<string, { path: string; id: string; kind: "url" | "thumb" }[]> = {};
      for (const m of media) {
        const b = bucketOf(m);
        (groups[b] ??= []).push({ path: m.storage_path, id: m.id, kind: "url" });
        if (m.thumbnail_path) (groups["post-media"] ??= []).push({ path: m.thumbnail_path, id: m.id, kind: "thumb" });
      }
      await Promise.all(
        Object.entries(groups).map(async ([bucket, items]) => {
          const { data } = await supabase.storage.from(bucket).createSignedUrls(items.map((i) => i.path), 600);
          (data ?? []).forEach((d, i) => {
            const item = items[i];
            if (!d.signedUrl) return;
            (out[item.id] ??= {})[item.kind] = d.signedUrl;
          });
        }),
      );
      return out;
    },
  });
}
