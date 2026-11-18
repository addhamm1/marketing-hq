"use client";

import { Building2, CircleHelp, Clapperboard, House, MapPin, Moon, Plane, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { WeekCell, WeekKind } from "./people";

export const KIND_ICON: Record<WeekKind, LucideIcon> = {
  branch: Building2,
  field: MapPin,
  shoot: Clapperboard,
  home: House,
  away: Plane,
  off: Moon,
  unknown: CircleHelp,
};

const KIND_STYLE: Record<WeekKind, string> = {
  branch: "bg-secondary text-secondary-foreground",
  field: "bg-info/10 text-foreground",
  shoot: "bg-accent text-accent-foreground",
  home: "bg-success/10 text-foreground",
  away: "bg-warning/15 text-foreground",
  off: "bg-muted text-muted-foreground",
  unknown: "border border-dashed text-muted-foreground",
};

/** The label for a cell: a place where there is one, otherwise the kind. */
export function useCellLabel(branchNames: ReadonlyMap<string, string>) {
  const t = useTranslations("week.kinds");
  const ts = useTranslations("week");
  return (cell: WeekCell) => {
    if (cell.kind === "branch") return (cell.branchId && branchNames.get(cell.branchId)) || t("branch");
    if (cell.kind === "field") return cell.place ?? t("field");
    if (cell.kind === "shoot") return cell.place ? ts("shootAt", { place: cell.place }) : t("shoot");
    return t(cell.kind);
  };
}

export function WeekChip({ cell, label, className }: { cell: WeekCell; label: string; className?: string }) {
  const Icon = KIND_ICON[cell.kind];
  return (
    <span
      title={label}
      data-kind={cell.kind}
      className={cn("inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium", KIND_STYLE[cell.kind], className)}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
