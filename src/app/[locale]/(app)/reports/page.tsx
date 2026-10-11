import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";

export default async function ReportsIndex() {
  const access = await requireAccess();
  const href = hasRole(access, "team_lead", "traffic_manager", "leadership", "super_admin")
    ? "/reports/workflow"
    : hasRole(access, "hr") ? "/reports/attendance" : "/reports/me";
  return redirect({ href, locale: await getLocale() });
}
