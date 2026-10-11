import { getTranslations } from "next-intl/server";
import { RequestTypesEditor } from "@/features/admin/request-types-editor";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("requestTypes") };
}

export default async function RequestTypesPage() {
  await requireRole("super_admin", "hr");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("request_types")
    .select("id, key, name_en, name_ar, category, is_active, requires_attachment_after_days, approval_chain, form_schema")
    .order("category")
    .order("name_en");
  if (error) throw error;
  return (
    <RequestTypesEditor
      types={(data ?? []).map((r) => ({ ...r, approval_chain: JSON.stringify(r.approval_chain, null, 2), form_schema: JSON.stringify(r.form_schema, null, 2) }))}
    />
  );
}
