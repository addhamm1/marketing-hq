import { CalendarDays, History } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, ErrorState } from "@/components/states/states";
import { cairoDateString, cairoInstant } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { MeetingRow } from "./meeting-row";
import { fetchMeetings } from "./queries";
import { formatDay } from "./time";
import type { Area, MeetingListItem } from "./types";

function groupByDay(meetings: MeetingListItem[]) {
  const days = new Map<string, MeetingListItem[]>();
  for (const m of meetings) {
    const day = cairoDateString(new Date(m.starts_at));
    days.set(day, [...(days.get(day) ?? []), m]);
  }
  return [...days.entries()];
}

/** Upcoming or past meetings, grouped by Cairo day. */
export async function MeetingList({ tab, area, me }: { tab: "upcoming" | "past"; area: Area; me: string }) {
  const t = await getTranslations("meetings");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();
  const { meetings, failed } = await fetchMeetings(supabase, tab, area, me);

  if (failed) return <ErrorState title={tc("errorTitle")} body={tc("errorBody")} />;
  if (!meetings.length) {
    return tab === "upcoming" ? (
      <EmptyState icon={<CalendarDays className="size-8" aria-hidden />} title={t("emptyUpcoming")} body={t("emptyUpcomingBody")} />
    ) : (
      <EmptyState icon={<History className="size-8" aria-hidden />} title={t("emptyPast")} body={t("emptyPastBody")} />
    );
  }

  const today = cairoDateString();
  const tomorrow = cairoDateString(new Date(cairoInstant(today, "12:00").getTime() + 86_400_000));
  const dayLabel = (day: string) => {
    if (day === today) return tc("today");
    if (day === tomorrow) return t("tomorrow");
    return formatDay(cairoInstant(day, "12:00").toISOString(), locale);
  };

  return (
    <div className="space-y-5">
      {groupByDay(meetings).map(([day, rows]) => (
        <section key={day} aria-labelledby={`day-${day}`}>
          <h2 id={`day-${day}`} className="text-muted-foreground mb-2 text-xs font-semibold">{dayLabel(day)}</h2>
          <ul className="space-y-2">
            {rows.map((m) => <li key={m.id}><MeetingRow meeting={m} area={area} me={me} /></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
