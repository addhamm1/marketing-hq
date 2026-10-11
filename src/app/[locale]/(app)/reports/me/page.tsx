import { getTranslations } from "next-intl/server";
import { averageClock, mean, rate } from "@/features/reports/metrics";
import { MyReport } from "@/features/reports/my-report";
import { inRange, resolveRange } from "@/features/reports/range";
import { requireAccess } from "@/lib/auth/session";
import { countWorkingDays, formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return { title: t("me") };
}

export default async function MyNumbers({ searchParams }: PageProps<"/[locale]/reports/me">) {
  const access = await requireAccess();
  const sp = await searchParams;
  const r = resolveRange(typeof sp.range === "string" ? sp.range : undefined);
  const supabase = await createClient();
  const [{ data: mine }, { data: days }, { data: holidays }] = await Promise.all([
    supabase.from("card_assignees").select("card_id").eq("user_id", access.user_id),
    supabase.from("v_attendance_daily").select("day, first_arrival, is_late, method").eq("user_id", access.user_id).gte("day", r.from).lte("day", r.to),
    supabase.from("holidays").select("day").gte("day", r.from).lte("day", r.to),
  ]);
  const ids = [...new Set((mine ?? []).map((m) => m.card_id))];
  const { data: flow } = ids.length ? await supabase.from("v_card_flow").select("*").in("card_id", ids) : { data: [] };
  const delivered = (flow ?? []).filter((c) => inRange(c.delivered_at, r));
  const withDue = delivered.filter((c) => c.due_at);
  const working = countWorkingDays(r.from, r.to, new Set((holidays ?? []).map((h) => h.day)));
  return (
    <MyReport
      deliveries={delivered.map((c) => ({ id: c.card_id!, title: c.title! }))}
      onTime={rate(withDue.filter((c) => c.on_time).length, withDue.length)}
      revisions={mean(delivered.map((c) => c.revision_count ?? 0))}
      daysIn={(days ?? []).length}
      workingDays={working}
      avgArrival={averageClock((days ?? []).filter((d) => d.method === "wifi" || d.method === "qr").map((d) => formatCairo(d.first_arrival!, "HH:mm")))}
      late={(days ?? []).filter((d) => d.is_late).length}
    />
  );
}
