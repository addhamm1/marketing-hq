import { hasRole, type Access } from "@/lib/auth/access";
import { cairoInstant, formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csv(rows: (string | number | null | undefined)[][]) {
  // Prefix risky leading characters so spreadsheets never evaluate them as formulas.
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** HR export: attendance sessions and approved leaves in a date range (row policies apply). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: access } = await supabase.rpc("my_access");
  if (!access || !hasRole(access as Access, "hr", "super_admin") || (access as Access).status !== "active") {
    return new Response("forbidden", { status: 403 });
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    return new Response("invalid range", { status: 400 });
  }
  const [sessions, leaves, people] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select("user_id, method, checked_in_at, checked_out_at, is_late, auto_closed, branch_id, branches(name_en)")
      .gte("checked_in_at", cairoInstant(from, "00:00").toISOString())
      .lt("checked_in_at", new Date(cairoInstant(to, "23:59").getTime() + 60_000).toISOString())
      .order("checked_in_at")
      .limit(20000),
    supabase
      .from("requests")
      .select("requester_id, starts_on, ends_on, days, request_types!inner(name_en, is_leave)")
      .eq("status", "approved")
      .eq("request_types.is_leave", true)
      .lte("starts_on", to)
      .gte("ends_on", from)
      .limit(5000),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const who = new Map((people.data ?? []).map((p) => [p.id, p]));
  const rows: (string | number | null)[][] = [["type", "name", "email", "date", "check_in", "check_out", "hours", "method", "branch", "late", "auto_closed", "leave_type", "leave_from", "leave_to", "days"]];
  for (const s of sessions.data ?? []) {
    const p = who.get(s.user_id);
    const hours = s.checked_out_at ? ((Date.parse(s.checked_out_at) - Date.parse(s.checked_in_at)) / 3_600_000).toFixed(2) : "";
    rows.push(["attendance", p?.full_name ?? "", p?.email ?? "", formatCairo(s.checked_in_at, "yyyy-MM-dd"), formatCairo(s.checked_in_at, "HH:mm"),
      s.checked_out_at ? formatCairo(s.checked_out_at, "HH:mm") : "", hours, s.method, (s.branches as unknown as { name_en: string } | null)?.name_en ?? "",
      s.is_late ? "yes" : "no", s.auto_closed ? "yes" : "no", "", "", "", ""]);
  }
  for (const l of leaves.data ?? []) {
    const p = who.get(l.requester_id);
    rows.push(["leave", p?.full_name ?? "", p?.email ?? "", "", "", "", "", "", "", "", "", (l.request_types as unknown as { name_en: string }).name_en, l.starts_on, l.ends_on, l.days === null ? "" : Number(l.days)]);
  }
  return new Response(csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pixel-hq-hr-${from}-to-${to}.csv"`,
      "cache-control": "no-store",
    },
  });
}
