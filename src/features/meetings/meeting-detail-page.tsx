import { Ban, CalendarDays, CheckCheck, ChevronLeft, Clock, Lock, MapPin, Repeat, Video } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ActionItems } from "./action-items";
import { AttendeeList, GuestList } from "./attendee-list";
import { isOver, meetingsBase, meetingTitle, placeLabel } from "./display";
import { MeetingLive } from "./meeting-live";
import { MeetingToolbar } from "./meeting-toolbar";
import { NotesEditor } from "./notes-editor";
import { fetchFormOptions, fetchMeetingDetail } from "./queries";
import { ResponseButtons } from "./response-buttons";
import { uuid } from "./schemas";
import { formatLongDay, formatTimeRange } from "./time";
import type { Area } from "./types";

function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-card rounded-xl border p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export async function MeetingDetailPage({ id, area }: { id: string; area: Area }) {
  if (!uuid.safeParse(id).success) notFound();
  const access = await requireAccess();
  const supabase = await createClient();
  const [meeting, options] = await Promise.all([fetchMeetingDetail(supabase, id), fetchFormOptions(supabase, access.user_id)]);
  if (!meeting) notFound();

  const me = access.user_id;
  const mine = meeting.meeting_attendees.find((a) => a.user_id === me);
  const isPart = !!mine || meeting.organizer_id === me;
  if (area === "portal" && !isPart) notFound();

  const t = await getTranslations("meetings");
  const locale = await getLocale();
  const canManage = meeting.organizer_id === me || hasRole(access, "super_admin", "traffic_manager");
  const over = isOver(meeting);
  const open = meeting.status === "scheduled" && !over;
  const fixedLocked = !!meeting.series_id && (area === "portal" || !access.is_team_app);
  const canContribute = isPart || canManage;
  const canMakeCards = canContribute && access.is_marketing && hasRole(access, "super_admin", "team_lead", "traffic_manager", "member");
  const place = placeLabel(meeting, locale);
  const signature = [meeting.status, meeting.starts_at, meeting.ends_at, meeting.room_id, meeting.title].join("|");

  return (
    <div className="mx-auto max-w-5xl">
      <MeetingLive id={meeting.id} signature={signature} />
      <Link href={meetingsBase(area)} className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("backToList")}
      </Link>

      <header className="mb-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 dir="auto" className="text-xl font-semibold tracking-tight break-words sm:text-2xl">{meetingTitle(meeting, locale)}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meeting.status === "cancelled" ? <Badge variant="destructive"><Ban aria-hidden />{t("status.cancelled")}</Badge> : null}
              {over ? <Badge variant="secondary" className="font-normal"><CheckCheck aria-hidden />{t("status.done")}</Badge> : null}
              {meeting.series_id ? <Badge variant="outline" className="font-normal"><Repeat aria-hidden />{t("fixedBadge")}</Badge> : null}
              {meeting.is_private ? <Badge variant="outline" className="font-normal"><Lock aria-hidden />{t("privateBadge")}</Badge> : null}
            </div>
          </div>
          <MeetingToolbar
            meeting={meeting}
            options={options}
            canEdit={canManage && open && !fixedLocked}
            canDownload={meeting.status !== "cancelled"}
          />
        </div>
        <ul className="text-muted-foreground space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0" aria-hidden />{formatLongDay(meeting.starts_at, locale)}</li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden />
            <span dir="ltr" className="tabular-nums">{formatTimeRange(meeting.starts_at, meeting.ends_at)}</span>
            <span className="text-xs">{t("cairoTime")}</span>
          </li>
          {place ? <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0" aria-hidden /><span className="min-w-0 break-words">{place}</span></li> : null}
          {meeting.online_url ? (
            <li className="flex items-center gap-2">
              <Video className="size-4 shrink-0" aria-hidden />
              <a href={meeting.online_url} target="_blank" rel="noopener noreferrer" className="text-primary-ink min-w-0 truncate underline-offset-4 hover:underline">{t("joinOnline")}</a>
            </li>
          ) : null}
        </ul>
        {mine && open ? <ResponseButtons id={meeting.id} current={mine.response} /> : null}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Panel title={t("detail.agenda")}>
            {meeting.agenda ? <p dir="auto" className="text-sm break-words whitespace-pre-wrap">{meeting.agenda}</p> : <p className="text-muted-foreground text-sm">{t("detail.noAgenda")}</p>}
          </Panel>
          <Panel title={t("detail.notes")}>
            <NotesEditor id={meeting.id} initial={meeting.notes} canEdit={canContribute} />
          </Panel>
          <Panel title={t("detail.actions")}>
            <ActionItems meetingId={meeting.id} items={meeting.actions} canContribute={canContribute} canMakeCards={canMakeCards} showCardLink={area === "team"} />
          </Panel>
        </div>
        <div className="min-w-0 space-y-4">
          <Panel title={t("detail.attendees")}>
            <AttendeeList attendees={meeting.meeting_attendees} organizerId={meeting.organizer_id} />
          </Panel>
          {meeting.guests.length ? (
            <Panel title={t("guests.title")}>
              <GuestList guests={meeting.guests} />
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
