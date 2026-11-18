import { getLocale, getTranslations } from "next-intl/server";
import { AllowancesEditor } from "@/features/hr/allowances-editor";
import { HolidaysEditor } from "@/features/hr/holidays-editor";
import { HrExport } from "@/features/hr/hr-export";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("leave") };
}

export default async function LeaveAdminPage({ searchParams }: PageProps<"/[locale]/admin/leave">) {
  await requireRole("hr", "super_admin");
  const sp = await searchParams;
  const year = Number(typeof sp.year === "string" ? sp.year : new Date().getFullYear());
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data: types }, { data: people }, { data: balances }, { data: holidays }] = await Promise.all([
    supabase.from("request_types").select("id, key, name_en, name_ar").eq("is_leave", true).order("name_en"),
    supabase.from("profiles").select("id, full_name, display_name").eq("status", "active").order("full_name"),
    supabase.from("leave_balances").select("user_id, type_id, allowance, used").eq("year", year),
    supabase.from("holidays").select("id, day, name_en, name_ar, is_half_day").order("day"),
  ]);
  return (
    <div className="space-y-8">
      <AllowancesEditor
        year={year}
        types={(types ?? []).map((t) => ({ id: t.id, key: t.key, name: locale === "ar" ? t.name_ar : t.name_en }))}
        people={(people ?? []).map((p) => ({ id: p.id, name: p.display_name || p.full_name }))}
        balances={(balances ?? []).map((b) => ({ ...b, allowance: Number(b.allowance), used: Number(b.used) }))}
      />
      <HolidaysEditor holidays={holidays ?? []} />
      <HrExport />
    </div>
  );
}
