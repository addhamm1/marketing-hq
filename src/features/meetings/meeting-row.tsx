import { Ban, CheckCheck, Lock, MapPin, Repeat, Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isOver, meetingsBase, meetingTitle, placeLabel } from "./display";
import { ResponseBadge } from "./response-badge";
import { formatTimeRange } from "./time";
import type { Area, MeetingListItem } from "./types";

const MAX_FACES = 4;

export function MeetingRow({ meeting, area, me }: { meeting: MeetingListItem; area: Area; me: string }) {
  const t = useTranslations("meetings");
  const locale = useLocale();
  const mine = meeting.meeting_attendees.find((a) => a.user_id === me);
  const place = placeLabel(meeting, locale);
  const cancelled = meeting.status === "cancelled";
  const faces = meeting.meeting_attendees.slice(0, MAX_FACES);
  const more = meeting.meeting_attendees.length - faces.length;

  return (
    <Link
      href={`${meetingsBase(area)}/${meeting.id}`}
      className="bg-card hover:bg-muted/50 focus-visible:ring-ring/50 flex items-start gap-3 rounded-xl border p-3 transition-colors outline-none focus-visible:ring-3"
    >
      <span dir="ltr" className={cn("w-[5.5rem] shrink-0 text-start text-sm font-medium tabular-nums", cancelled && "text-muted-foreground line-through")}>
        {formatTimeRange(meeting.starts_at, meeting.ends_at)}
      </span>
      <span className="min-w-0 flex-1">
        <span dir="auto" className={cn("block truncate text-sm font-medium", cancelled && "text-muted-foreground")}>
          {meetingTitle(meeting, locale)}
        </span>
        {place || meeting.online_url ? (
          <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 text-xs">
            {place ? <MapPin className="size-3 shrink-0" aria-hidden /> : <Video className="size-3 shrink-0" aria-hidden />}
            <span className="truncate">{place || t("onlineMeeting")}</span>
          </span>
        ) : null}
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {cancelled ? (
            <Badge variant="destructive"><Ban aria-hidden />{t("status.cancelled")}</Badge>
          ) : isOver(meeting) ? (
            <Badge variant="secondary" className="font-normal"><CheckCheck aria-hidden />{t("status.done")}</Badge>
          ) : mine ? (
            <ResponseBadge response={mine.response} />
          ) : null}
          {meeting.series_id ? <Badge variant="outline" className="font-normal"><Repeat aria-hidden />{t("fixedBadge")}</Badge> : null}
          {meeting.is_private ? <Badge variant="outline" className="font-normal"><Lock aria-hidden />{t("privateBadge")}</Badge> : null}
        </span>
      </span>
      <span className="hidden shrink-0 items-center -space-x-1.5 sm:flex rtl:space-x-reverse">
        {faces.map((a) => <UserAvatar key={a.user_id} userId={a.user_id} size={26} tooltip={false} />)}
        {more > 0 ? <span className="text-muted-foreground ps-2.5 text-xs tabular-nums">+{more}</span> : null}
      </span>
    </Link>
  );
}
