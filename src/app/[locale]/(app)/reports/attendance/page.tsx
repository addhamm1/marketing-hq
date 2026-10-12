import { getTranslations } from "next-intl/server";
import { AttendanceReport, type AttendanceRow } from "@/features/reports/attendance-report";
import { averageClock, rate } from "@/features/reports/metrics";
import { resolveRange } from "@/features/reports/range";
import { requireRole } from "@/lib/auth/session";
import { countWorkingDays, formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("reports");
  return { title: t("attendance") };
}

export default async function AttendancePage({ searchParams }: PageProps<"/[locale]/reports/attendance">) {
  await requireRole("team_lead", "hr", "super_admin", "leadership");
  const sp = await searchParams;
  const r = resolveRange(typeof sp.range === "string" ? sp.range : undefined);
  const supabase = await createClient();
  const [{ data: days }, { data: holidays }, { data: people }, { data: leave }] = await Promise.all([
    supabase.from("v_attendance_daily").select("user_id, day, first_arrival, is_late, method, hours").gte("day", r.from).lte("day", r.to),
    supabase.from("holidays").select("day").gte("day", r.from).lte("day", r.to),
    supabase.from("profiles").select("id, full_name, display_name, status").eq("status", "active"),
    supabase.from("v_leave_usage").select("user_id, allowance, used, year").eq("year", Number(r.to.slice(0, 4))),
  ]);
  const working = countWorkingDays(r.from, r.to, new Set((holidays ?? []).map((h) => h.day)));
  const byUser = new Map<string, NonNullable<typeof days>>();
  for (const d of days ?? []) byUser.set(d.user_id!, [...(byUser.get(d.user_id!) ?? []), d]);
  const leaveBy = new Map<string, { used: number; allowance: number }>();
  for (const l of leave ?? []) {
    const cur = leaveBy.get(l.user_id!) ?? { used: 0, allowance: 0 };
    leaveBy.set(l.user_id!, { used: cur.used + Number(l.used), allowance: cur.allowance + Number(l.allowance) });
  }
  const visible = new Set([...byUser.keys(), ...leaveBy.keys()]);
  const rows: AttendanceRow[] = (people ?? [])
    .filter((p) => visible.has(p.id))
    .map((p) => {
      const d = byUser.get(p.id) ?? [];
      const office = d.filter((x) => x.method === "gps" || x.method === "wifi" || x.method === "qr" || x.method === "manual");
      return {
        id: p.id,
        name: p.display_name || p.full_name,
        daysIn: d.length,
        rate: rate(d.length, working),
        avgArrival: averageClock(office.map((x) => formatCairo(x.first_arrival!, "HH:mm"))),
        late: d.filter((x) => x.is_late).length,
        remote: d.filter((x) => x.method === "home").length,
        field: d.filter((x) => x.method === "field").length,
        leaveUsed: leaveBy.get(p.id)?.used ?? 0,
        leaveAllowance: leaveBy.get(p.id)?.allowance ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return <AttendanceReport rows={rows} workingDays={working} />;
}
