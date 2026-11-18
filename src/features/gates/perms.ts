import { hasRole, type Access } from "@/lib/auth/access";

/** Mirrors can_manage_gates() in the database, which has the final say. */
export function canManageGates(access: Access | null): boolean {
  return hasRole(access, "super_admin", "traffic_manager");
}
