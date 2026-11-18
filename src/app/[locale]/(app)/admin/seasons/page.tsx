import { getTranslations } from "next-intl/server";
import { SeasonsEditor } from "@/features/launch/seasons-editor";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("seasonsAdmin");
  return { title: t("title") };
}

export default async function SeasonsPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasonal_events")
    .select("id, key, name_en, name_ar, starts_on, ends_on, items, is_active")
    .order("starts_on");
  if (error) throw error;
  return <SeasonsEditor seasons={data ?? []} />;
}
