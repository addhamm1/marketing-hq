import { CalendarClock, CircleCheck, CircleX, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ShootStatus } from "./schemas";

const STYLE = {
  planned: { icon: CalendarClock, variant: "outline" },
  confirmed: { icon: CircleCheck, variant: "default" },
  wrapped: { icon: Flag, variant: "secondary" },
  cancelled: { icon: CircleX, variant: "destructive" },
} as const;

/** Status is always an icon and a word, never colour alone. */
export function ShootStatusBadge({ status }: { status: ShootStatus }) {
  const t = useTranslations("shoots.status");
  const { icon: Icon, variant } = STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden /> {t(status)}
    </Badge>
  );
}
