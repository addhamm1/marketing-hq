"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ReadyCard } from "./types";

function ReadyItem({ card, color }: { card: ReadyCard; color?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `card:${card.id}`, data: { type: "card", card } });
  return (
    <li ref={setNodeRef} {...attributes} {...listeners}
      className={cn("bg-card flex cursor-grab touch-none items-center gap-2 rounded-lg border p-2 text-sm", isDragging && "opacity-40")}
      style={color ? { borderInlineStartWidth: 3, borderInlineStartColor: color } : undefined}>
      <GripVertical className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <span className="line-clamp-2">{card.title}</span>
    </li>
  );
}

export function ReadyPanel({ cards, brandColor }: { cards: ReadyCard[]; brandColor: (id: string) => string | undefined }) {
  const t = useTranslations("content");
  return (
    <aside className="bg-muted/40 space-y-3 rounded-xl border p-3">
      <div>
        <h2 className="text-sm font-semibold">{t("readyToSchedule")} · {cards.length}</h2>
        <p className="text-muted-foreground text-xs">{t("dragHint")}</p>
      </div>
      {cards.length === 0 ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs"><Inbox className="size-4" aria-hidden /> {t("readyEmpty")}</p>
      ) : (
        <ul className="space-y-2">{cards.map((c) => <ReadyItem key={c.id} card={c} color={c.brand_id ? brandColor(c.brand_id) : undefined} />)}</ul>
      )}
    </aside>
  );
}
