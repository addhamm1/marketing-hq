import { getTranslations } from "next-intl/server";
import { OrganisationEditor } from "@/features/admin/organisation-editor";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("organisation") };
}

export default async function OrganisationPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const [{ data: departments }, { data: teams }] = await Promise.all([
    supabase.from("departments").select("id, name_en, name_ar, is_marketing, default_approver_id").order("name_en"),
    supabase.from("teams").select("id, name_en, name_ar, color").order("name_en"),
  ]);
  return <OrganisationEditor departments={departments ?? []} teams={teams ?? []} />;
}
