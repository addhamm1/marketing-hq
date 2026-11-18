import { hasRole, isGuestOnly, type Access } from "./auth/access";

export type NavKey =
  | "myDay" | "map" | "boards" | "myWork" | "meetings" | "gates" | "shoots" | "week" | "celebrations"
  | "approvals" | "requests" | "calendar" | "content" | "reports" | "people" | "admin"
  | "portalHome" | "portalNew" | "portalWeek" | "portalMeetings" | "portalCelebrations"
  | "portalApprovals" | "portalFiles";

export type NavItem = { key: NavKey; href: string };

/** Navigation entries for the signed-in user (PRODUCT_SPEC.md section 2). */
export function teamNav(access: Access): NavItem[] {
  if (isGuestOnly(access)) {
    return [
      { key: "boards", href: "/boards" },
      { key: "myWork", href: "/my-work" },
    ];
  }
  const items: NavItem[] = [
    { key: "myDay", href: "/my-day" },
    { key: "map", href: "/map" },
    { key: "boards", href: "/boards" },
    { key: "myWork", href: "/my-work" },
    { key: "meetings", href: "/meetings" },
    { key: "gates", href: "/gates" },
    { key: "shoots", href: "/shoots" },
    { key: "week", href: "/week" },
    { key: "approvals", href: "/approvals" },
    { key: "content", href: "/content" },
    { key: "requests", href: "/requests" },
    { key: "calendar", href: "/calendar" },
    { key: "celebrations", href: "/celebrations" },
    { key: "reports", href: "/reports" },
    { key: "people", href: "/people" },
  ];
  if (hasRole(access, "super_admin", "hr")) items.push({ key: "admin", href: "/admin" });
  return items;
}

export function portalNav(): NavItem[] {
  return [
    { key: "portalHome", href: "/portal" },
    { key: "portalNew", href: "/portal/requests/new" },
    { key: "portalWeek", href: "/portal/week" },
    { key: "portalMeetings", href: "/portal/meetings" },
    { key: "portalCelebrations", href: "/portal/celebrations" },
    { key: "portalApprovals", href: "/portal/approvals" },
    { key: "portalFiles", href: "/portal/files" },
  ];
}

export function navFor(access: Access, area: "team" | "portal"): NavItem[] {
  if (area === "portal" || !access.is_team_app) return portalNav();
  return teamNav(access);
}

/** The four primary tabs on the mobile bottom bar; the rest go under "More". */
export function splitForBottomBar(items: NavItem[]) {
  return { primary: items.slice(0, 4), more: items.slice(4) };
}
