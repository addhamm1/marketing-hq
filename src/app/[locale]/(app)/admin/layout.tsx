import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { AdminTabs } from "@/features/admin/admin-tabs";
import { hasRole } from "@/lib/auth/access";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const access = await requireRole("super_admin", "hr");
  const t = await getTranslations("admin");
  const tt = await getTranslations("trello");
  const isAdmin = hasRole(access, "super_admin");
  const tabs = [
    { href: "/admin/users", label: t("users") },
    ...(isAdmin ? [{ href: "/admin/branches", label: t("branches") }] : []),
    { href: "/admin/leave", label: t("leave") },
    ...(isAdmin ? [{ href: "/admin/request-types", label: t("requestTypes") }] : []),
    { href: "/admin/settings", label: t("settings") },
    ...(isAdmin ? [{ href: "/admin/import", label: tt("title") }] : []),
    ...(isAdmin ? [{ href: "/admin/audit", label: t("audit") }] : []),
  ];
  return (
    <>
      <PageHeader title={t("title")} />
      <AdminTabs tabs={tabs} />
      <div className="mt-6">{children}</div>
    </>
  );
}
