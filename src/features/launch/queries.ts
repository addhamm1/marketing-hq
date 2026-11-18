import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LaunchData } from "./checks";

/** Whether outside services are set up. Booleans only: the values never leave this file. */
function serviceFlags() {
  const set = (name: string) => !!process.env[name]?.trim();
  return {
    emailConfigured: set("RESEND_API_KEY"),
    pushConfigured: set("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && set("VAPID_PRIVATE_KEY") && set("VAPID_SUBJECT"),
  };
}

/** Live data behind the launch checklist. Call only after checking the caller is a super admin. */
export async function loadLaunchData(today: string): Promise<LaunchData> {
  const supabase = await createClient();
  const year = Number(today.slice(0, 4));
  const [branches, profiles, roles, rooms, holidays, templates, annual] = await Promise.all([
    supabase.from("branches").select("id, is_active, location_confirmed_at"),
    supabase.from("profiles").select("id, status, birth_month, joined_on, phone, home_branch_id, celebrate"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("meeting_rooms").select("branch_id, is_active"),
    supabase.from("holidays").select("day").gte("day", today),
    supabase.from("gate_templates").select("owner_id, is_active, gate_tracks(is_active)"),
    supabase.from("leave_balances").select("user_id, allowance, request_types!inner(key)").eq("year", year).eq("request_types.key", "annual_leave"),
  ]);
  const failed = [branches, profiles, roles, rooms, holidays, templates, annual].find((r) => r.error);
  if (failed?.error) throw failed.error;

  const rolesBy = new Map<string, string[]>();
  for (const r of roles.data ?? []) rolesBy.set(r.user_id, [...(rolesBy.get(r.user_id) ?? []), r.role]);
  const staff = (profiles.data ?? []).map((p) => ({ ...p, roles: rolesBy.get(p.id) ?? [] }));

  return {
    today,
    branches: branches.data ?? [],
    staff,
    annualAllowances: (annual.data ?? []).map((a) => ({ user_id: a.user_id, allowance: Number(a.allowance) })),
    hrHolders: staff.filter((p) => p.status === "active" && p.roles.includes("hr")).length,
    rooms: rooms.data ?? [],
    holidays: (holidays.data ?? []).map((h) => h.day),
    gateTemplates: (templates.data ?? []).map((g) => ({
      owner_id: g.owner_id,
      is_active: g.is_active,
      track_active: g.gate_tracks?.is_active ?? false,
    })),
    ...serviceFlags(),
  };
}
