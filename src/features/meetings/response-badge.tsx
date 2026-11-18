import { Check, CircleHelp, Clock, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttendeeResponse } from "./types";

const STYLE: Record<AttendeeResponse, { icon: LucideIcon; className: string }> = {
  accepted: { icon: Check, className: "bg-emerald-50 text-emerald-800" },
  tentative: { icon: CircleHelp, className: "bg-amber-50 text-amber-800" },
  declined: { icon: X, className: "bg-rose-50 text-rose-700" },
  pending: { icon: Clock, className: "bg-slate-100 text-slate-700" },
};

/** An attendee's answer, always as an icon with a word. */
export function ResponseBadge({ response }: { response: AttendeeResponse }) {
  const t = useTranslations("meetings.response");
  const { icon: Icon, className } = STYLE[response];
  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      <Icon aria-hidden />
      {t(response)}
    </Badge>
  );
}
