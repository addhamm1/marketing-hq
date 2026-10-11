"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cairoDateString, formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { STATUS_DOT, type PostStatus } from "@/features/content/types";

/** The card's content calendar post, linking back to it (D6-02). */
export function LinkedPost({ cardId }: { cardId: string }) {
  const t = useTranslations("card");
  const tc = useTranslations("content");
  const { data: post } = useQuery({
    queryKey: ["card-post", cardId],
    queryFn: async () => (await createClient().from("posts").select("id, status, scheduled_at").eq("card_id", cardId).maybeSingle()).data,
  });
  if (!post) return null;
  const month = post.scheduled_at ? cairoDateString(new Date(post.scheduled_at)).slice(0, 7) : "";
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{t("linkedPost")}</h3>
      <Link href={`/content?${month ? `month=${month}&` : ""}post=${post.id}`} className="hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-2 text-sm">
        <CalendarRange className="text-primary size-4" aria-hidden />
        <span className="flex-1" dir="ltr">{post.scheduled_at ? formatCairo(post.scheduled_at, "d MMM, HH:mm") : "—"}</span>
        <span className="inline-flex items-center gap-1 text-xs"><span className={cn("size-2 rounded-full", STATUS_DOT[post.status as PostStatus])} />{tc(`status.${post.status as PostStatus}`)}</span>
      </Link>
    </section>
  );
}
