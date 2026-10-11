import { getLocale, getTranslations } from "next-intl/server";
import { DepartmentsReport } from "@/features/reports/departments-report";
import { mean } from "@/features/reports/metrics";
import { inRange, resolveRange } from "@/features/reports/range";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return { title: t("departments") };
}

/** Per department: requests sent, delivery time, and how fast they confirm deliverables (D6-06). */
export default async function DepartmentsPage({ searchParams }: PageProps<"/[locale]/reports/departments">) {
  await requireRole("team_lead", "traffic_manager", "leadership", "super_admin");
  const sp = await searchParams;
  const r = resolveRange(typeof sp.range === "string" ? sp.range : undefined);
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data: flow }, { data: depts }, { data: steps }, { data: profiles }] = await Promise.all([
    supabase.from("v_card_flow").select("card_id, created_at, delivered_at, days_to_deliver, requesting_department_id"),
    supabase.from("departments").select("id, name_en, name_ar, is_marketing").order("name_en"),
    supabase.from("approval_steps").select("approver_id, created_at, decided_at").eq("subject_type", "card").eq("card_stage", "confirmation").not("decided_at", "is", null).gte("decided_at", r.fromIso),
    supabase.from("profiles").select("id, department_id"),
  ]);
  const deptOf = new Map((profiles ?? []).map((p) => [p.id, p.department_id]));
  const rows = (depts ?? []).filter((d) => !d.is_marketing).map((d) => {
    const mine = (flow ?? []).filter((c) => c.requesting_department_id === d.id);
    const turn = (steps ?? []).filter((s) => deptOf.get(s.approver_id) === d.id).map((s) => (Date.parse(s.decided_at!) - Date.parse(s.created_at)) / 3_600_000);
    return {
      name: locale === "ar" ? d.name_ar : d.name_en,
      sent: mine.filter((c) => inRange(c.created_at, r)).length,
      delivery: mean(mine.filter((c) => inRange(c.delivered_at, r)).map((c) => Number(c.days_to_deliver))),
      turnaround: mean(turn),
    };
  });
  return <DepartmentsReport rows={rows} />;
}
