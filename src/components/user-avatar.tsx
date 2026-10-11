"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePeople } from "./people-context";
import { PixelAvatar } from "./pixel-avatar-slot";

const PALETTE = ["bg-teal-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-sky-600", "bg-emerald-600", "bg-indigo-600"];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

/** Person avatar: the pixel character when available, otherwise initials. */
export function UserAvatar({
  userId,
  name,
  size = 24,
  tooltip = true,
  className,
}: {
  userId: string;
  name?: string;
  size?: number;
  tooltip?: boolean;
  className?: string;
}) {
  const { byId } = usePeople();
  const label = name ?? byId.get(userId)?.display_name ?? "?";
  const avatar = (
    <Avatar className={cn("ring-background ring-2", className)} style={{ width: size, height: size }}>
      <PixelAvatar userId={userId} size={size} />
      <AvatarFallback className={cn("text-[10px] font-medium text-white", PALETTE[hash(userId) % PALETTE.length])}>
        {initialsOf(label)}
      </AvatarFallback>
    </Avatar>
  );
  if (!tooltip) return avatar;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AvatarStack({ ids, max = 3, size = 22 }: { ids: string[]; max?: number; size?: number }) {
  const unique = [...new Set(ids)];
  return (
    <div className="flex -space-x-1.5 rtl:space-x-reverse">
      {unique.slice(0, max).map((id) => (
        <UserAvatar key={id} userId={id} size={size} />
      ))}
      {unique.length > max ? (
        <span className="bg-muted text-muted-foreground ring-background flex items-center justify-center rounded-full text-[10px] ring-2" style={{ width: size, height: size }}>
          +{unique.length - max}
        </span>
      ) : null}
    </div>
  );
}
