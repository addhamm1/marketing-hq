"use client";

import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { Badge } from "@/components/ui/badge";
import type { Stage } from "@/features/boards/types";
import { Link } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PORTAL_STATUS_STYLE, portalStatus } from "./status";

type Row = {
  id: string;
  title: string;
  stage: Stage | null;
  returned_reason: string | null;
  due_at: string | null;
  request_kind: "strategic" | "urgent" | "internal" | null;
  created_at: string;
  requester_id: string | null;
  is_late_submission: boolean;
};

export function PortalStatusBadge({ stage, returnedReason }: { stage: Stage | null; returnedReason: string | null }) {
  const t = useTranslations("portal.status");
  const status = portalStatus(stage, returnedReason);
  return <Badge className={cn("border-transparent", PORTAL_STATUS_STYLE[status])}>{t(status)}</Badge>;
}

export function PortalRequestRow({ card }: { card: Row }) {
  const tk = useTranslations("requestKind");
  const name = usePersonName();
  return (
    <li>
      <Link href={`/portal/requests/${card.id}`} className="hover:bg-muted/40 flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{card.title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {card.request_kind ? tk(card.request_kind) : ""} · {name(card.requester_id)} ·{" "}
            <span dir="ltr">{formatCairo(card.created_at, "d MMM")}</span>
          </p>
        </div>
        {card.due_at ? (
          <span className="text-muted-foreground text-xs" dir="ltr">
            {formatCairo(card.due_at, "d MMM")}
          </span>
        ) : null}
        <PortalStatusBadge stage={card.stage} returnedReason={card.returned_reason} />
      </Link>
    </li>
  );
}
