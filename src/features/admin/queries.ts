import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth/access";

export type OrgOption = { id: string; name_en: string; name_ar: string; department_id?: string };

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  department_id: string | null;
  team_id: string | null;
  home_branch_id: string | null;
  title: string | null;
  status: "active" | "inactive";
  must_change_password: boolean;
  roles: { role: AppRole; team_id: string | null }[];
  schedule: { workdays: number[]; start_time: string; end_time: string };
};

export async function getOrgOptions() {
  const supabase = await createClient();
  const [departments, teams, branches] = await Promise.all([
    supabase.from("departments").select("id, name_en, name_ar").order("name_en"),
    supabase.from("teams").select("id, name_en, name_ar, department_id").order("name_en"),
    supabase.from("branches").select("id, name_en, name_ar").eq("is_active", true).order("name_en"),
  ]);
  return {
    departments: (departments.data ?? []) as OrgOption[],
    teams: (teams.data ?? []) as OrgOption[],
    branches: (branches.data ?? []) as OrgOption[],
  };
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const [profiles, roles, schedules] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, department_id, team_id, home_branch_id, title, status, must_change_password")
      .order("full_name"),
    supabase.from("user_roles").select("user_id, role, team_id"),
    supabase.from("schedules").select("user_id, workdays, start_time, end_time"),
  ]);
  if (profiles.error) throw profiles.error;
  const rolesBy = new Map<string, AdminUser["roles"]>();
  for (const r of roles.data ?? []) {
    rolesBy.set(r.user_id, [...(rolesBy.get(r.user_id) ?? []), { role: r.role, team_id: r.team_id }]);
  }
  const scheduleBy = new Map((schedules.data ?? []).map((s) => [s.user_id, s]));
  return (profiles.data ?? []).map((p) => {
    const s = scheduleBy.get(p.id);
    return {
      ...p,
      roles: rolesBy.get(p.id) ?? [],
      schedule: {
        workdays: s?.workdays ?? [6, 0, 1, 2, 3, 4],
        start_time: (s?.start_time ?? "10:00").slice(0, 5),
        end_time: (s?.end_time ?? "18:00").slice(0, 5),
      },
    };
  });
}
