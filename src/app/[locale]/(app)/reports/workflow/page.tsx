import { getLocale, getTranslations } from "next-intl/server";
import { WorkflowDashboard } from "@/features/reports/workflow-dashboard";
import { inRange, resolveRange } from "@/features/reports/range";
import { countBy, mean, median, rate, weekly } from "@/features/reports/metrics";
import { STAGES } from "@/features/boards/types";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return { title: t("workflow") };
}

export default async function WorkflowReport({ searchParams }: PageProps<"/[locale]/reports/workflow">) {
  await requireRole("team_lead", "traffic_manager", "leadership", "super_admin");
  const sp = await searchParams;
  const r = resolveRange(typeof sp.range === "string" ? sp.range : undefined);
  const brand = typeof sp.brand === "string" ? sp.brand : "all";
  const locale = await getLocale();
  const ts = await getTranslations("stages");
  const tr = await getTranslations("revisionReason");
  const tk = await getTranslations("requestKind");
  const supabase = await createClient();
  const [{ data: flow }, { data: durations }, { data: workload }, { data: steps }, { data: depts }, { data: brands }, { data: people }] = await Promise.all([
    supabase.from("v_card_flow").select("*"),
    supabase.from("v_stage_durations").select("card_id, stage, hours, left_at").gte("entered_at", r.fromIso),
    supabase.from("v_workload").select("user_id, stage, open_cards"),
    supabase.from("approval_steps").select("subject_id, revision_reason, decided_at").eq("subject_type", "card").not("revision_reason", "is", null).gte("decided_at", r.fromIso),
    supabase.from("departments").select("id, name_en, name_ar"),
    supabase.from("brands").select("id, name, color").order("name"),
    supabase.rpc("public_profiles"),
  ]);
  const cards = (flow ?? []).filter((c) => brand === "all" || c.brand_id === brand);
  const ids = new Set(cards.map((c) => c.card_id));
  const created = cards.filter((c) => inRange(c.created_at, r));
  const delivered = cards.filter((c) => inRange(c.delivered_at, r));
  const withDue = delivered.filter((c) => c.due_at);
  const onTime = withDue.filter((c) => c.on_time);
  const late = created.filter((c) => c.is_late_submission);
  const open = cards.filter((c) => c.stage && !["ready_to_publish", "published", "reported"].includes(c.stage));
  const deptName = new Map((depts ?? []).map((d) => [d.id, locale === "ar" ? d.name_ar : d.name_en]));
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.display_name]));
  const drill = (list: typeof cards) => list.map((c) => ({ id: c.card_id!, title: c.title! }));

  const createdWeeks = weekly(created, (c) => c.created_at, r.from, r.to);
  const deliveredWeeks = weekly(delivered, (c) => c.delivered_at, r.from, r.to);
  const workloadBy = new Map<string, number>();
  for (const w of workload ?? []) workloadBy.set(w.user_id!, (workloadBy.get(w.user_id!) ?? 0) + (w.open_cards ?? 0));
  const closedDurations = (durations ?? []).filter((d) => d.left_at && ids.has(d.card_id!));

  return (
    <WorkflowDashboard
      brands={brands ?? []}
      brand={brand}
      stats={{
        created: { value: created.length, cards: drill(created) },
        delivered: { value: delivered.length, cards: drill(delivered) },
        medianDays: median(delivered.map((c) => Number(c.days_to_deliver))),
        onTime: rate(onTime.length, withDue.length),
        revisions: mean(delivered.map((c) => c.revision_count ?? 0)),
        late: { value: late.length, cards: drill(late) },
      }}
      perWeek={createdWeeks.map((w, i) => ({ week: w.week.slice(5), created: w.count, delivered: deliveredWeeks[i]?.count ?? 0 }))}
      openByStage={STAGES.filter((s) => !["ready_to_publish", "published", "reported"].includes(s)).map((s) => ({ name: ts(s), value: open.filter((c) => c.stage === s).length }))}
      hoursInStage={STAGES.map((s) => ({ name: ts(s), value: Math.round(mean(closedDurations.filter((d) => d.stage === s).map((d) => Number(d.hours))) ?? 0) })).filter((x) => x.value > 0)}
      reasons={countBy((steps ?? []).filter((s) => ids.has(s.subject_id)), (s) => (s.revision_reason ? tr(s.revision_reason) : null))}
      byDepartment={countBy(created, (c) => deptName.get(c.requesting_department_id ?? "") ?? null)}
      byVertical={countBy(created, (c) => c.vertical)}
      byKind={countBy(created, (c) => (c.request_kind ? tk(c.request_kind) : null))}
      workload={[...workloadBy.entries()].map(([id, value]) => ({ name: nameOf.get(id) ?? "—", value })).sort((a, b) => b.value - a.value)}
    />
  );
}
