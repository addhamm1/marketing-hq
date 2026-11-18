import { getTranslations } from "next-intl/server";
import { getAdminUsers, getOrgOptions } from "@/features/admin/queries";
import { STAFF_FIELDS, type StaffField } from "@/features/launch/checks";
import { UsersTable } from "@/features/admin/users-table";
import { hasRole } from "@/lib/auth/access";
import { requireRole } from "@/lib/auth/session";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("users") };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ missing?: string | string[] }> }) {
  const access = await requireRole("super_admin", "hr");
  const [users, org, { missing }] = await Promise.all([getAdminUsers(), getOrgOptions(), searchParams]);
  const filter = STAFF_FIELDS.find((f): f is StaffField => f === missing) ?? null;
  return (
    <UsersTable users={users} org={org} isAdmin={hasRole(access, "super_admin")} currentUserId={access.user_id} missing={filter} />
  );
}
