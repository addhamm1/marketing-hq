import { Files } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/states/states";
import { DeliveredFiles } from "@/features/portal/delivered-files";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("portal");
  return { title: t("files") };
}

export default async function PortalFilesPage() {
  const access = await requireAccess();
  const t = await getTranslations("portal");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("id, name, kind, mime, created_at, card_id, cards!inner(title, stage, requesting_department_id)")
    .eq("cards.requesting_department_id", access.department_id ?? "00000000-0000-0000-0000-000000000000")
    .in("cards.stage", ["ready_to_publish", "published", "reported"])
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const files = (data ?? []).map((f) => ({ id: f.id, name: f.name, kind: f.kind, mime: f.mime, created_at: f.created_at, card_id: f.card_id, card_title: (f.cards as unknown as { title: string }).title }));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("deliveredFiles")} />
      {files.length ? <DeliveredFiles files={files} /> : <EmptyState icon={<Files className="size-8" aria-hidden />} title={t("noFiles")} />}
    </div>
  );
}
