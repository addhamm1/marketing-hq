"use client";

import { useDroppable } from "@dnd-kit/core";
import { useLocale, useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { PostTile } from "./post-tile";
import type { Post } from "./types";

function DayColumn({ date, label, today, posts, brandColor, canDrag, onOpen }: {
  date: string; label: string; today: boolean; posts: Post[]; brandColor: (id: string) => string | undefined; canDrag: boolean; onOpen: (id: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("content");
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}`, data: { type: "day", date } });
  return (
    <section ref={setNodeRef} className={cn("bg-card flex min-h-64 w-[80vw] shrink-0 flex-col rounded-xl border sm:w-auto", isOver && "ring-primary ring-2", posts.length === 0 && "bg-accent/30")}>
      <header className={cn("border-b px-3 py-2 text-sm font-medium", today && "text-primary-ink")}>
        {label} <span className="text-muted-foreground tabular-nums">{date.slice(8)}</span>
      </header>
      <div className="flex-1 space-y-2 p-2">
        {posts.map((p) => (
          <div key={p.id} className="space-y-1">
            <PostTile post={p} large caption={(locale === "ar" ? p.caption_ar : p.caption_en) || p.caption_en || p.caption_ar}
              brandColor={brandColor(p.brand_id)} draggable={canDrag && p.status !== "published"} onOpen={onOpen} />
            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="text-muted-foreground">{t(`status.${p.status}`)}</span>
              {p.owner_id ? <UserAvatar userId={p.owner_id} size={18} /> : null}
            </div>
          </div>
        ))}
        {posts.length === 0 ? <p className="text-muted-foreground py-6 text-center text-xs">{t("emptyDay")}</p> : null}
      </div>
    </section>
  );
}

export function WeekView({ days, today, postsByDay, brandColor, canDrag, onOpen }: {
  days: string[]; today: string; postsByDay: Map<string, Post[]>; brandColor: (id: string) => string | undefined; canDrag: boolean; onOpen: (id: string) => void;
}) {
  const tw = useTranslations("weekdays");
  const order = [6, 0, 1, 2, 3, 4, 5];
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
      {days.map((d, i) => (
        <DayColumn key={d} date={d} label={tw(String(order[i]) as "0")} today={d === today} posts={postsByDay.get(d) ?? []}
          brandColor={brandColor} canDrag={canDrag} onOpen={onOpen} />
      ))}
    </div>
  );
}
