import { ArrowLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PeopleProvider } from "@/components/people-context";
import { PageHeader } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { loadRhythm } from "@/features/gates/queries";
import { RhythmView } from "@/features/gates/rhythm/rhythm-view";
import { Link, redirect } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("gates.rhythm");
  return { title: t("title") };
}

export default async function GateRhythmPage() {
  await requireAccess();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_manage_gates");
  if (!allowed) return redirect({ href: "/gates", locale: await getLocale() });

  const t = await getTranslations("gates.rhythm");
  const { tracks, templates, people } = await loadRhythm();
  return (
    <PeopleProvider people={people}>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/gates"><ArrowLeft className="rtl:rotate-180" aria-hidden />{t("back")}</Link>
          </Button>
        }
      />
      <RhythmView tracks={tracks} templates={templates} />
    </PeopleProvider>
  );
}
