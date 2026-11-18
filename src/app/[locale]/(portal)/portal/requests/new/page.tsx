import { addMonths, startOfMonth } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { fetchBoardSettings, fetchBrands } from "@/features/boards/queries";
import { NewRequestForm } from "@/features/portal/new-request-form";
import { readDeadlineDay, strategicDeadline } from "@/features/tracker/strategic-deadline";
import { requireRole } from "@/lib/auth/session";
import { cairoDateString, nowInCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("portal");
  return { title: t("newRequest") };
}

export default async function NewRequestPage() {
  await requireRole("requester", "final_approver");
  const t = await getTranslations("portal");
  const locale = await getLocale();
  const supabase = await createClient();
  const todayKey = cairoDateString();
  const [brands, settings, { data: deadline }, { data: holidays }] = await Promise.all([
    fetchBrands(supabase),
    fetchBoardSettings(supabase),
    supabase.from("settings").select("value").eq("key", "strategic_deadline_day").maybeSingle(),
    supabase.from("holidays").select("day").eq("is_half_day", false).gte("day", `${todayKey.slice(0, 7)}-01`).lte("day", `${todayKey.slice(0, 7)}-31`),
  ]);
  const today = nowInCairo();
  const next = startOfMonth(addMonths(today, 1));
  const forMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  // The same working-day deadline as the portal banner, the reminders and the late flag.
  const due = strategicDeadline(todayKey, readDeadlineDay(deadline?.value), new Set((holidays ?? []).map((h) => h.day)));
  const monthLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(next.getFullYear(), next.getMonth(), 15)),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("newRequest")} />
      <NewRequestForm
        options={{ brands, verticals: settings.verticals, formats: settings.formats, platforms: settings.platforms }}
        forMonth={forMonth}
        monthLabel={monthLabel}
        deadlineDay={Number(due.deadline.slice(8))}
        isLate={due.daysLeft < 0}
      />
    </div>
  );
}
