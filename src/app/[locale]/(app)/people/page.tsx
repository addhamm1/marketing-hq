import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { PeopleDirectory } from "@/features/people/directory";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("people");
  return { title: t("title") };
}

export default async function PeoplePage() {
  await requireAccess();
  const t = await getTranslations("people");
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data: people }, { data: teams }, { data: sessions }] = await Promise.all([
    supabase.rpc("public_profiles"),
    supabase.from("teams").select("id, name_en, name_ar, color"),
    supabase.rpc("who_is_in", {}),
  ]);
  const teamName = Object.fromEntries((teams ?? []).map((tm) => [tm.id, { name: locale === "ar" ? tm.name_ar : tm.name_en, color: tm.color }]));
  return (
    <div>
      <PageHeader title={t("title")} />
      <PeopleDirectory people={people ?? []} teams={teamName} checkedIn={(sessions ?? []).map((s) => s.user_id)} />
    </div>
  );
}
