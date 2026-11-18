"use client";

import { MailCheck, MailQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { ResponseBadge } from "./response-badge";
import type { Attendee, Guest } from "./types";

/** Everyone invited, with their answer. The organiser comes first. */
export function AttendeeList({ attendees, organizerId }: { attendees: Attendee[]; organizerId: string | null }) {
  const t = useTranslations("meetings.detail");
  const personName = usePersonName();
  const sorted = [...attendees].sort((a, b) => {
    if (a.user_id === organizerId) return -1;
    if (b.user_id === organizerId) return 1;
    return personName(a.user_id).localeCompare(personName(b.user_id));
  });

  if (!sorted.length) return <p className="text-muted-foreground text-sm">{t("noAttendees")}</p>;
  return (
    <ul className="space-y-2.5">
      {sorted.map((a) => (
        <li key={a.user_id} className="flex items-center gap-2">
          <UserAvatar userId={a.user_id} size={26} tooltip={false} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{personName(a.user_id)}</span>
            {a.user_id === organizerId ? <span className="text-muted-foreground block text-xs">{t("organizer")}</span> : null}
          </span>
          <ResponseBadge response={a.response} />
        </li>
      ))}
    </ul>
  );
}

/** Outside guests and whether their invitation has gone out. */
export function GuestList({ guests }: { guests: Guest[] }) {
  const t = useTranslations("meetings.guests");
  return (
    <ul className="space-y-2.5">
      {guests.map((g) => (
        <li key={g.id} className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span dir="auto" className="block truncate text-sm">{g.name}</span>
            <span dir="ltr" className="text-muted-foreground block truncate text-start text-xs">{g.email}</span>
          </span>
          <Badge variant="secondary" className="font-normal">
            {g.invited_at ? <MailCheck aria-hidden /> : <MailQuestion aria-hidden />}
            {g.invited_at ? t("invited") : t("notInvited")}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
