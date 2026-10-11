"use client";

import { RotateCcw } from "lucide-react";
import { AvatarStack } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { PriorityBadge, StageBadge } from "@/features/boards/badges";
import type { Priority, Stage } from "@/features/boards/types";

export type WorkCard = {
  id: string;
  board_id: string;
  title: string;
  stage: Stage | null;
  due_at: string | null;
  priority: Priority;
  revision_count: number;
  brand_id: string | null;
  card_assignees: { user_id: string }[];
};

export function WorkRow({ card, brandColor, overdue }: { card: WorkCard; brandColor?: string; overdue?: boolean }) {
  return (
    <li>
      <Link
        href={`/boards/${card.board_id}?card=${card.id}`}
        className="hover:bg-muted/40 flex items-center gap-3 px-4 py-3"
        style={brandColor ? { borderInlineStartWidth: 3, borderInlineStartColor: brandColor } : undefined}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{card.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {card.stage ? <StageBadge stage={card.stage} /> : null}
            <PriorityBadge priority={card.priority} />
            {card.revision_count ? (
              <span className="text-muted-foreground inline-flex items-center gap-0.5">
                <RotateCcw className="size-3" aria-hidden /> {card.revision_count}
              </span>
            ) : null}
          </div>
        </div>
        {card.due_at ? (
          <span className={`text-xs whitespace-nowrap ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`} dir="ltr">
            {formatCairo(card.due_at, "EEE d MMM, HH:mm")}
          </span>
        ) : null}
        <AvatarStack ids={card.card_assignees.map((a) => a.user_id)} size={20} />
      </Link>
    </li>
  );
}
