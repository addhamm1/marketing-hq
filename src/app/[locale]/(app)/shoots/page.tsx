import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { splitShoots } from "@/features/shoots/helpers";
import { canCreateShoot, listShoots } from "@/features/shoots/queries";
import { ShootList } from "@/features/shoots/shoot-list";
import { Link } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";

export async function generateMetadata() {
  const t = await getTranslations("shoots");
  return { title: t("title") };
}

export default async function ShootsPage() {
  await requireAccess();
  const t = await getTranslations("shoots");
  const [shoots, canCreate] = await Promise.all([listShoots(), canCreateShoot()]);
  const { upcoming, past } = splitShoots(shoots, cairoDateString());
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={canCreate ? <Button asChild><Link href="/shoots/new"><Plus aria-hidden /> {t("new")}</Link></Button> : null}
      />
      <ShootList title={t("upcoming")} shoots={upcoming} empty={t("noUpcoming")} />
      <ShootList title={t("past")} shoots={past} empty={t("noPast")} />
    </div>
  );
}
