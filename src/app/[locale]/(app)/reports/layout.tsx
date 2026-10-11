import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/states/states";
import { ReportTabs } from "@/features/reports/report-tabs";
import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";

export default async function ReportsLayout({ children }: LayoutProps<"/[locale]/reports">) {
  const access = await requireAccess();
  const t = await getTranslations("reports");
  const lead = hasRole(access, "team_lead", "traffic_manager", "leadership", "super_admin");
  const attendance = hasRole(access, "team_lead", "hr", "super_admin", "leadership");
  const tabs = [
    ...(lead ? [{ href: "/reports/workflow", label: t("workflow") }] : []),
    ...(attendance ? [{ href: "/reports/attendance", label: t("attendance") }] : []),
    { href: "/reports/me", label: t("me") },
    ...(lead ? [{ href: "/reports/departments", label: t("departments") }] : []),
  ];
  return (
    <>
      <PageHeader title={t("title")} />
      <Suspense><ReportTabs tabs={tabs} /></Suspense>
      <div className="mt-6">{children}</div>
    </>
  );
}
