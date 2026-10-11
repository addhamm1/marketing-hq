import { getTranslations } from "next-intl/server";
import { TrelloImportForm } from "@/features/trello/import-form";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("trello");
  return { title: t("title") };
}

export default async function TrelloImportPage() {
  await requireRole("super_admin");
  const t = await getTranslations("trello");
  const supabase = await createClient();
  const { data } = await supabase.from("boards").select("id, name").eq("is_pipeline", false).is("archived_at", null).order("name");
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">{t("title")}</h2>
      <TrelloImportForm boards={data ?? []} />
    </>
  );
}
