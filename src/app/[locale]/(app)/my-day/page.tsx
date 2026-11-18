import { getTranslations } from "next-intl/server";
import { AllClear } from "@/features/my-day/all-clear";
import { BriefingHeader } from "@/features/my-day/briefing-header";
import { CheckinStrip } from "@/features/my-day/checkin-strip";
import { MeetingSection } from "@/features/my-day/meeting-section";
import { ActionSection, CelebrationSection, ShootSection } from "@/features/my-day/plan-sections";
import { getCheckinState, getMyDay } from "@/features/my-day/queries";
import { isAllClear } from "@/features/my-day/summary";
import { ApprovalSection, CardSection, GateSection } from "@/features/my-day/work-sections";
import { requireAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("myDay");
  return { title: t("title") };
}

export default async function MyDayPage() {
  const access = await requireAccess();
  const supabase = await createClient();
  const now = new Date();
  const date = cairoDateString(now);
  const [day, checkin] = await Promise.all([
    getMyDay(supabase, access.user_id, date, { now }),
    access.is_marketing ? getCheckinState(supabase, access.user_id, date) : Promise.resolve(undefined),
  ]);
  const name = (access.display_name || access.full_name).trim().split(/\s+/)[0];
  const allClear = isAllClear(day);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BriefingHeader name={name} day={day} now={now} />
      {checkin !== undefined ? <CheckinStrip state={checkin} /> : null}
      {allClear ? (
        <AllClear />
      ) : (
        <>
          <MeetingSection meetings={day.meetings} />
          <CardSection cards={day.cards} now={now} />
          <ApprovalSection approvals={day.approvals} />
          <GateSection gates={day.gates} />
          <ShootSection shoots={day.shoots} />
          <ActionSection actions={day.actions} />
        </>
      )}
      {!allClear || day.celebrations.items.length > 0 || !day.celebrations.ok ? (
        <CelebrationSection celebrations={day.celebrations} userId={access.user_id} />
      ) : null}
    </div>
  );
}
