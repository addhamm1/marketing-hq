import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { Card, CardContent } from "@/components/ui/card";
import { canCreateShoot, getBranchOptions } from "@/features/shoots/queries";
import { ShootForm } from "@/features/shoots/shoot-form";
import { redirect } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";

export async function generateMetadata() {
  const t = await getTranslations("shoots");
  return { title: t("new") };
}

export default async function NewShootPage() {
  const access = await requireAccess();
  if (!(await canCreateShoot())) return redirect({ href: "/shoots", locale: await getLocale() });
  const t = await getTranslations("shoots");
  const branches = await getBranchOptions();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("new")} />
      <Card>
        <CardContent>
          <ShootForm
            branches={branches}
            defaults={{
              title: "",
              shoot_on: cairoDateString(),
              call_time: "09:00",
              wrap_time: "",
              place: "branch",
              branch_id: access.home_branch_id,
              location_name: "",
              location_url: "",
              status: "planned",
              producer_id: access.user_id,
              brief: "",
              backup_plan: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
