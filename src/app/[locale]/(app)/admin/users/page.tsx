import { getTranslations } from "next-intl/server";
import { getAdminUsers, getOrgOptions } from "@/features/admin/queries";
import { UsersTable } from "@/features/admin/users-table";
import { hasRole } from "@/lib/auth/access";
import { requireRole } from "@/lib/auth/session";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("users") };
}

export default async function AdminUsersPage() {
  const access = await requireRole("super_admin", "hr");
  const [users, org] = await Promise.all([getAdminUsers(), getOrgOptions()]);
  return (
    <UsersTable users={users} org={org} isAdmin={hasRole(access, "super_admin")} currentUserId={access.user_id} />
  );
}
