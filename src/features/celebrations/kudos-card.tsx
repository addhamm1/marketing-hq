"use client";

import { Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { usePeople } from "@/components/people-context";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { CAIRO } from "@/lib/dates";
import { BADGE_ICONS } from "./badge-icons";
import type { Kudos } from "./types";

export function KudosCard({ kudos, canDelete, onDelete }: { kudos: Kudos; canDelete: boolean; onDelete: () => void }) {
  const t = useTranslations("celebrations");
  const format = useFormatter();
  const { byId } = usePeople();
  const nameOf = (id: string) => byId.get(id)?.display_name ?? t("formerColleague");
  const BadgeIcon = BADGE_ICONS[kudos.badge];
  return (
    <li className="bg-card rounded-xl border p-4" data-testid="kudos-card">
      <div className="flex items-start gap-3">
        <UserAvatar userId={kudos.from_id} name={nameOf(kudos.from_id)} size={36} tooltip={false} />
        <div className="min-w-0 flex-1">
          <p className="text-sm break-words">
            <span className="font-medium">{nameOf(kudos.from_id)}</span>{" "}
            <span className="text-muted-foreground">{t("feed.sentTo")}</span>{" "}
            <span className="font-medium">{nameOf(kudos.to_id)}</span>
          </p>
          <time dateTime={kudos.created_at} className="text-muted-foreground text-xs">
            {format.dateTime(new Date(kudos.created_at), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: CAIRO })}
          </time>
        </div>
        {canDelete ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} aria-label={t("feed.delete")}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </div>
      <p dir="auto" className="mt-3 text-sm break-words whitespace-pre-wrap">{kudos.message}</p>
      <p className="bg-accent text-accent-foreground mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
        <BadgeIcon className="size-3.5" aria-hidden />
        {t(`badges.${kudos.badge}`)}
      </p>
    </li>
  );
}
