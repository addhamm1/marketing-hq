import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type Access = {
  user_id: string;
  email: string;
  full_name: string;
  display_name: string;
  status: Database["public"]["Enums"]["profile_status"];
  must_change_password: boolean;
  locale: "en" | "ar";
  presence: Database["public"]["Enums"]["presence_status"];
  avatar_seen: boolean;
  department_id: string | null;
  team_id: string | null;
  home_branch_id: string | null;
  roles: { role: AppRole; team_id: string | null }[];
  is_marketing: boolean;
  is_team_app: boolean;
  is_portal: boolean;
};

export function hasRole(access: Access | null, ...roles: AppRole[]) {
  return !!access && access.roles.some((r) => roles.includes(r.role));
}

export function teamLeadTeams(access: Access): string[] {
  return access.roles.filter((r) => r.role === "team_lead" && r.team_id).map((r) => r.team_id!);
}

/** Guests only see boards they are invited to and their own work. */
export function isGuestOnly(access: Access) {
  return access.roles.length > 0 && access.roles.every((r) => r.role === "guest");
}

const GUEST_PATHS = ["/boards", "/my-work"];

export function homePath(access: Access): string {
  if (isGuestOnly(access)) return "/boards";
  if (access.is_team_app) return "/map";
  if (access.is_portal) return "/portal";
  return "/no-access";
}

const PUBLIC_PREFIXES = ["/sign-in", "/kiosk"];
const ANY_SIGNED_IN = ["/change-password", "/me/account", "/no-access"];

function matches(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix + "/");
}

export type RouteDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: string }
  | { kind: "sign-out"; to: string };

/**
 * Coarse route guard (DATA_MODEL.md section 2). `path` excludes the locale.
 * Fine-grained checks (admin, reports) live in the pages and on the server.
 */
export function decideRoute(path: string, signedIn: boolean, access: Access | null): RouteDecision {
  const isPublic = PUBLIC_PREFIXES.some((p) => matches(path, p));
  if (matches(path, "/kiosk")) return { kind: "allow" };

  if (!signedIn || !access) {
    if (isPublic) return { kind: "allow" };
    const next = path && path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
    return { kind: "redirect", to: `/sign-in${next}` };
  }

  if (access.status !== "active") return { kind: "sign-out", to: "/sign-in?reason=inactive" };

  if (access.must_change_password) {
    return matches(path, "/change-password")
      ? { kind: "allow" }
      : { kind: "redirect", to: "/change-password" };
  }

  const home = homePath(access);
  if (path === "/" || path === "" || matches(path, "/sign-in")) return { kind: "redirect", to: home };
  if (ANY_SIGNED_IN.some((p) => matches(path, p))) {
    if (matches(path, "/no-access") && home !== "/no-access") return { kind: "redirect", to: home };
    return { kind: "allow" };
  }
  if (!access.is_team_app && !access.is_portal) return { kind: "redirect", to: "/no-access" };
  if (matches(path, "/portal")) {
    return access.is_portal ? { kind: "allow" } : { kind: "redirect", to: home };
  }
  if (!access.is_team_app) return { kind: "redirect", to: home };
  if (isGuestOnly(access) && !GUEST_PATHS.some((p) => matches(path, p))) {
    return { kind: "redirect", to: home };
  }
  return { kind: "allow" };
}
