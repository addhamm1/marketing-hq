"use client";

import { useDroppable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PostTile } from "./post-tile";
import type { Post } from "./types";

const WEEK = [6, 0, 1, 2, 3, 4, 5];

function DayCell({ date, inMonth, today, posts, brandColor, canDrag, onOpen }: {
  date: string; inMonth: boolean; today: boolean; posts: Post[]; brandColor: (id: string) => string | undefined; canDrag: boolean; onOpen: (id: string) => void;
}) {
  const t = useTranslations("content");
  const [expanded, setExpanded] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}`, data: { type: "day", date } });
  const shown = expanded ? posts : posts.slice(0, 3);
  return (
    <div
      ref={setNodeRef}
      data-date={date}
      className={cn(
        "min-h-28 border-e border-b p-1 transition-colors",
        !inMonth && "bg-muted/40 text-muted-foreground",
        inMonth && posts.length === 0 && "bg-accent/30",
        isOver && "bg-primary/10",
      )}
    >
      <div className={cn("mb-1 flex size-6 items-center justify-center rounded-full text-xs tabular-nums", today && "bg-primary text-primary-foreground")}>
        {Number(date.slice(8))}
      </div>
      <div className="space-y-1">
        {shown.map((p) => <PostTile key={p.id} post={p} brandColor={brandColor(p.brand_id)} draggable={canDrag && p.status !== "published"} onOpen={onOpen} />)}
        {posts.length > 3 && !expanded ? (
          <button type="button" onClick={() => setExpanded(true)} className="text-primary-ink text-[11px] font-medium">
            {t("more", { count: posts.length - 3 })}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MonthGrid({ grid, today, postsByDay, brandColor, canDrag, onOpen }: {
  grid: { date: string; inMonth: boolean }[];
  today: string;
  postsByDay: Map<string, Post[]>;
  brandColor: (id: string) => string | undefined;
  canDrag: boolean;
  onOpen: (id: string) => void;
}) {
  const tw = useTranslations("weekdays");
  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <div className="min-w-[48rem]">
        <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-xs">
          {WEEK.map((d) => <div key={d} className="py-2">{tw(String(d) as "0")}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((c) => (
            <DayCell key={c.date} date={c.date} inMonth={c.inMonth} today={c.date === today} posts={postsByDay.get(c.date) ?? []}
              brandColor={brandColor} canDrag={canDrag} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}
