"use client";

import { useDraggable } from "@dnd-kit/core";
import { FileText, Film } from "lucide-react";
import { memo } from "react";
import { PlatformBadges } from "@/features/boards/badges";
import { formatCairo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useMediaUrls } from "./media-urls";
import { STATUS_DOT, type Post } from "./types";

export function Thumb({ post, className }: { post: Post; className?: string }) {
  const first = post.media[0];
  const { data } = useMediaUrls(first ? [first] : []);
  const src = first ? (data?.[first.id]?.thumb ?? (first.media_type === "image" ? data?.[first.id]?.url : undefined)) : undefined;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("bg-muted object-cover", className)} loading="lazy" />;
  }
  return (
    <span className={cn("bg-muted text-muted-foreground flex items-center justify-center", className)}>
      {first?.media_type === "video" ? <Film className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
    </span>
  );
}

export const PostTile = memo(function PostTile({ post, brandColor, draggable, onOpen, large, caption }: {
  post: Post;
  brandColor?: string;
  draggable: boolean;
  onOpen: (id: string) => void;
  large?: boolean;
  caption?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `post:${post.id}`, data: { type: "post", post }, disabled: !draggable });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(post.id)}
      data-testid={`post-${post.id}`}
      className={cn(
        "bg-card group flex cursor-pointer gap-1.5 overflow-hidden rounded-md border text-start text-[11px] shadow-xs hover:shadow-sm",
        large ? "flex-col p-2" : "items-center p-1",
        isDragging && "opacity-40",
      )}
      style={brandColor ? { borderInlineStartWidth: 3, borderInlineStartColor: brandColor } : undefined}
    >
      <Thumb post={post} className={large ? "aspect-square w-full rounded" : "size-7 shrink-0 rounded"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[post.status])} aria-hidden />
          {post.scheduled_at ? <span className="font-medium tabular-nums" dir="ltr">{formatCairo(post.scheduled_at, "HH:mm")}</span> : null}
        </div>
        <PlatformBadges platforms={post.platforms} />
        {large && caption ? <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{caption}</p> : null}
      </div>
    </div>
  );
});
