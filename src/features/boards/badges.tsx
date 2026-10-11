"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Priority, Stage } from "./types";

export const STAGE_COLOR: Record<Stage, string> = {
  request: "bg-slate-100 text-slate-700",
  performance_input: "bg-emerald-50 text-emerald-700",
  intake: "bg-amber-50 text-amber-800",
  brief_schedule: "bg-orange-50 text-orange-700",
  production: "bg-sky-50 text-sky-700",
  creative_review: "bg-violet-50 text-violet-700",
  confirmation: "bg-fuchsia-50 text-fuchsia-700",
  ready_to_publish: "bg-teal-50 text-teal-700",
  published: "bg-green-50 text-green-700",
  reported: "bg-zinc-100 text-zinc-600",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const t = useTranslations("stages");
  return <Badge className={cn("border-transparent font-medium", STAGE_COLOR[stage], className)}>{t(stage)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const t = useTranslations("priority");
  if (priority === "normal" || priority === "low") return null;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", priority === "urgent" ? "border-destructive/40 text-destructive" : "border-amber-400/60 text-amber-700")}
    >
      {priority === "urgent" ? <AlertTriangle className="size-3" aria-hidden /> : null}
      {t(priority)}
    </Badge>
  );
}

export type TimerState = "ok" | "amber" | "red";

/** Stage timer: amber at 75% of the target, red past it (calendar hours, v1). */
export function stageTimer(enteredAt: string | null, targetHours: number | undefined, now = Date.now()) {
  if (!enteredAt || !targetHours) return { state: "ok" as TimerState, hours: 0 };
  const hours = Math.max(0, (now - Date.parse(enteredAt)) / 3_600_000);
  const state: TimerState = hours >= targetHours ? "red" : hours >= targetHours * 0.75 ? "amber" : "ok";
  return { state, hours: Math.floor(hours) };
}

export function TimerDot({ state, hours }: { state: TimerState; hours: number }) {
  const t = useTranslations("boards");
  if (state === "ok") return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11px] font-medium", state === "red" ? "text-destructive" : "text-amber-700")}
      title={state === "red" ? t("overTarget") : t("nearTarget")}
    >
      <Clock className="size-3" aria-hidden />
      {hours}h
    </span>
  );
}

const PLATFORM_SHORT: Record<string, string> = {
  facebook: "FB", instagram: "IG", linkedin: "IN", tiktok: "TT", snapchat: "SC",
  google_ads: "GA", website: "WEB", print: "PRT", internal: "INT",
};
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "bg-blue-600", instagram: "bg-pink-600", linkedin: "bg-sky-700", tiktok: "bg-zinc-900",
  snapchat: "bg-yellow-400 text-zinc-900", google_ads: "bg-green-600", website: "bg-slate-600",
  print: "bg-stone-600", internal: "bg-slate-400",
};

/** Text badges, no platform logos (PRODUCT_SPEC.md section 9). */
export function PlatformBadges({ platforms, className }: { platforms: string[]; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap gap-0.5", className)} dir="ltr">
      {platforms.map((p) => (
        <span key={p} className={cn("rounded px-1 text-[9px] leading-4 font-bold text-white", PLATFORM_COLOR[p] ?? "bg-slate-500")}>
          {PLATFORM_SHORT[p] ?? p.slice(0, 3).toUpperCase()}
        </span>
      ))}
    </span>
  );
}
