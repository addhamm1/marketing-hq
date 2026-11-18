import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { fetchStrategicStatus, fetchTrackerRows } from "@/features/tracker/queries";
import { StrategicBanner } from "@/features/tracker/strategic-banner";
import { TrackerList } from "@/features/tracker/tracker-list";
import { Link } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("portal");
  return { title: t("myRequests") };
}

export default async function PortalHome() {
  const access = await requireAccess();
  const t = await getTranslations("portal");
  const supabase = await createClient();
  const [rows, strategic] = await Promise.all([fetchTrackerRows(supabase, access), fetchStrategicStatus(supabase, access)]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("myRequests")}
        actions={
          <Button asChild>
            <Link href="/portal/requests/new">
              <Plus aria-hidden /> {t("newRequest")}
            </Link>
          </Button>
        }
      />
      {strategic ? <StrategicBanner status={strategic} /> : null}
      <TrackerList rows={rows} />
    </div>
  );
}
