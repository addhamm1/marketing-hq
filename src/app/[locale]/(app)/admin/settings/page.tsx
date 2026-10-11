import { getTranslations } from "next-intl/server";
import { SettingsEditor } from "@/features/admin/settings-editor";
import { hasRole } from "@/lib/auth/access";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("settings") };
}

export default async function AdminSettingsPage() {
  const access = await requireRole("super_admin", "hr");
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("key, value").order("key");
  if (error) throw error;
  const isAdmin = hasRole(access, "super_admin");
  return (
    <SettingsEditor
      settings={(data ?? []).map((s) => ({ key: s.key, value: JSON.stringify(s.value, null, 2) }))}
      editable={isAdmin ? "all" : ["lateness_grace_minutes"]}
    />
  );
}
