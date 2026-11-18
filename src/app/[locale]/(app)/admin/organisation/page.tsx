import { getTranslations } from "next-intl/server";
import { OrganisationEditor } from "@/features/admin/organisation-editor";
import { OrgCatalog } from "@/features/launch/org-catalog";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("organisation") };
}

export default async function OrganisationPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const [{ data: departments }, { data: teams }, { data: brands }] = await Promise.all([
    supabase.from("departments").select("id, name_en, name_ar, is_marketing, default_approver_id").order("name_en"),
    supabase.from("teams").select("id, name_en, name_ar, color").order("name_en"),
    supabase.from("brands").select("id, name, color").order("name"),
  ]);
  return (
    <>
      <OrganisationEditor departments={departments ?? []} teams={teams ?? []} />
      <OrgCatalog departments={departments ?? []} brands={brands ?? []} />
    </>
  );
}
