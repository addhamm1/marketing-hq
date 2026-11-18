import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { fetchPeople } from "@/features/boards/queries";
import { CallSheet } from "@/features/shoots/call-sheet";
import { PrintButton } from "@/features/shoots/print-button";
import { getShoot } from "@/features/shoots/queries";
import { Link } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("shoots");
  return { title: t("callSheet") };
}

export default async function CallSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAccess();
  const data = await getShoot(id, access);
  if (!data) notFound();
  const t = await getTranslations("shoots");
  const people = await fetchPeople(await createClient());
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <Link href={`/shoots/${id}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("backToShoot")}
        </Link>
        <PrintButton />
      </div>
      <CallSheet data={data} names={Object.fromEntries(people.map((p) => [p.id, p.display_name]))} />
    </div>
  );
}
