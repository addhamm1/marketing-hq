import { getTranslations } from "next-intl/server";
import { BranchesList } from "@/features/admin/branches-list";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("branches") };
}

export default async function AdminBranchesPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name_en, name_ar, area, map_key, public_ips, checkin_methods, is_active")
    .order("area")
    .order("name_en");
  if (error) throw error;
  return <BranchesList branches={(data ?? []).map((b) => ({ ...b, public_ips: b.public_ips.map(String) }))} />;
}
