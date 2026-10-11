"use client";

import { CheckSquare, MessageSquare, Paperclip, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { AvatarStack } from "@/components/user-avatar";
import { formatCairo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PriorityBadge, stageTimer, TimerDot } from "./badges";
import type { BoardCard, Label } from "./types";

type Props = {
  card: BoardCard;
  labels: Map<string, Label>;
  brandColor?: string;
  targetHours?: number;
  dragging?: boolean;
  overlay?: boolean;
  onOpen?: (id: string) => void;
};

export const CardTile = memo(function CardTile({ card, labels, brandColor, targetHours, dragging, overlay, onOpen }: Props) {
  const t = useTranslations("requestKind");
  const overdue = card.due_at && Date.parse(card.due_at) < Date.now() && card.stage !== "published" && card.stage !== "reported";
  const timer = card.stage ? stageTimer(card.stage_entered_at, targetHours) : null;
  const cardLabels = card.label_ids.map((id) => labels.get(id)).filter(Boolean) as Label[];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(card.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.(card.id);
      }}
      data-testid={`card-${card.id}`}
      className={cn(
        "bg-card group relative cursor-pointer rounded-lg border p-2.5 text-start text-sm shadow-xs transition-shadow select-none hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        dragging && "opacity-40",
        overlay && "rotate-1 shadow-lg",
      )}
      style={brandColor ? { borderInlineStartWidth: 3, borderInlineStartColor: brandColor } : undefined}
    >
      {cardLabels.length ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {cardLabels.map((l) => (
            <span key={l.id} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: l.color }} title={l.name} />
          ))}
        </div>
      ) : null}
      <p className="leading-snug font-medium break-words">{card.title}</p>
      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
        {card.request_kind === "urgent" ? <span className="text-destructive font-semibold">{t("urgent")}</span> : null}
        <PriorityBadge priority={card.priority} />
        {card.due_at ? (
          <span className={cn(overdue && "text-destructive font-medium")} dir="ltr">
            {formatCairo(card.due_at, "d MMM")}
          </span>
        ) : null}
        {timer ? <TimerDot state={timer.state} hours={timer.hours} /> : null}
        {card.revision_count > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <RotateCcw className="size-3" aria-hidden />
            {card.revision_count}
          </span>
        ) : null}
        {card.checklist.total > 0 ? (
          <span className={cn("inline-flex items-center gap-0.5", card.checklist.done === card.checklist.total && "text-emerald-600")}>
            <CheckSquare className="size-3" aria-hidden />
            {card.checklist.done}/{card.checklist.total}
          </span>
        ) : null}
        {card.comment_count > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <MessageSquare className="size-3" aria-hidden />
            {card.comment_count}
          </span>
        ) : null}
        {card.attachment_count > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <Paperclip className="size-3" aria-hidden />
            {card.attachment_count}
          </span>
        ) : null}
        {card.assignees.length ? (
          <span className="ms-auto">
            <AvatarStack ids={card.assignees.map((a) => a.user_id)} size={20} />
          </span>
        ) : null}
      </div>
    </div>
  );
});
