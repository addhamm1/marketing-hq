import { CalendarClock, CircleHelp, Clock, MapPin, Video } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { clock, pick } from "./format";
import { MeetingResponse } from "./meeting-response";
import { BriefingSection, Tag } from "./section";
import type { MeetingItem, Section } from "./types";

export async function MeetingSection({ meetings }: { meetings: Section<MeetingItem> }) {
  const t = await getTranslations("myDay");
  const locale = await getLocale();
  return (
    <BriefingSection
      id="meetings"
      icon={CalendarClock}
      title={t("sections.meetings")}
      count={meetings.items.length}
      failed={!meetings.ok}
      empty={t("empty.meetings")}
      more={{ href: "/meetings", label: t("more.meetings") }}
    >
      {meetings.items.map((m) => {
        const title = pick(m.title, locale);
        return (
          <li key={m.id} className="flex min-w-0 gap-3 px-4 py-3" data-testid="meeting-row">
            <div className="w-11 shrink-0 text-sm font-semibold tabular-nums" dir="ltr">
              {clock(m.startsAt)}
              <span className="text-muted-foreground block text-xs font-normal">{clock(m.endsAt)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/meetings/${m.id}`} className="text-sm font-medium break-words hover:underline">
                {title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {m.room ? <Tag icon={MapPin}>{pick(m.room, locale)}</Tag> : null}
                {m.online ? <Tag icon={Video}>{t("meeting.online")}</Tag> : null}
                {!m.room && !m.online ? <Tag icon={MapPin}>{t("meeting.noRoom")}</Tag> : null}
                {m.response === "pending" ? <Tag tone="soon" icon={Clock}>{t("meeting.awaiting")}</Tag> : null}
                {m.response === "tentative" ? <Tag icon={CircleHelp}>{t("meeting.tentative")}</Tag> : null}
              </div>
              {m.response === "pending" ? <MeetingResponse meetingId={m.id} title={title} /> : null}
            </div>
          </li>
        );
      })}
    </BriefingSection>
  );
}
