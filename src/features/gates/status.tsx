"use client";

import { Circle, CircleCheck, CircleDot, CircleSlash, CircleX, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { GateStatus } from "./types";

const META: Record<GateStatus, { icon: LucideIcon; tone: string }> = {
  not_started: { icon: Circle, tone: "text-muted-foreground" },
  in_progress: { icon: CircleDot, tone: "text-info" },
  done: { icon: CircleCheck, tone: "text-success" },
  at_risk: { icon: TriangleAlert, tone: "text-primary-ink" },
  missed: { icon: CircleX, tone: "text-destructive" },
  skipped: { icon: CircleSlash, tone: "text-muted-foreground" },
};

/** `plain` takes the colour of the surface, for icons on black or yellow marks. */
export function StatusIcon({ status, plain, className }: { status: GateStatus; plain?: boolean; className?: string }) {
  const { icon: Icon, tone } = META[status];
  return <Icon className={cn("size-3.5 shrink-0", !plain && tone, className)} aria-hidden />;
}

/** Status is always an icon with its name. */
export function StatusLabel({ status, className }: { status: GateStatus; className?: string }) {
  const t = useTranslations("gates.status");
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", className)}>
      <StatusIcon status={status} />
      {t(status)}
    </span>
  );
}
