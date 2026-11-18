import { expectedHolidays, missingHolidays, oneYearAfter } from "./holidays";

export const STAFF_FIELDS = ["birthday", "joined", "phone", "branch"] as const;
export type StaffField = (typeof STAFF_FIELDS)[number];

export type StaffRow = {
  status: string;
  roles: readonly string[];
  birth_month: number | null;
  joined_on: string | null;
  phone: string | null;
  home_branch_id: string | null;
  celebrate: boolean;
};

/** Staff: an active employee. Freelance guests and accounts with no role are not staff. */
export function isStaffMember(p: Pick<StaffRow, "status" | "roles">) {
  return p.status === "active" && p.roles.some((r) => r !== "guest");
}

/** Someone who opted out of celebrations is not chased for a birthday. */
export function isMissing(p: StaffRow, field: StaffField) {
  if (field === "birthday") return p.celebrate && p.birth_month === null;
  if (field === "joined") return !p.joined_on;
  if (field === "phone") return !p.phone?.trim();
  return !p.home_branch_id;
}

export type LaunchData = {
  today: string;
  branches: { id: string; is_active: boolean; location_confirmed_at: string | null }[];
  staff: (StaffRow & { id: string })[];
  /** This year's annual leave allowance per person. */
  annualAllowances: { user_id: string; allowance: number }[];
  hrHolders: number;
  rooms: { branch_id: string | null; is_active: boolean }[];
  holidays: string[];
  gateTemplates: { owner_id: string | null; is_active: boolean; track_active: boolean }[];
  emailConfigured: boolean;
  pushConfigured: boolean;
};

export type CheckId =
  | "branches" | "birthday" | "joined" | "phone" | "branch" | "leave" | "hr"
  | "rooms" | "holidays" | "gates" | "email" | "push";
export type CheckStatus = "ready" | "review" | "blocked";
export type CheckRow = { id: CheckId; count: number; status: CheckStatus; href: string | null; holders?: number };

// Blocking: the app misbehaves on day one without it. The rest should be reviewed.
const BLOCKING: readonly CheckId[] = ["leave", "hr", "email"];

function row(id: CheckId, count: number, href: string | null, holders?: number): CheckRow {
  const status: CheckStatus = count === 0 ? "ready" : BLOCKING.includes(id) ? "blocked" : "review";
  return { id, count, status, href, holders };
}

export function computeChecks(d: LaunchData): CheckRow[] {
  const staff = d.staff.filter(isStaffMember);
  const missing = (field: StaffField) => staff.filter((p) => isMissing(p, field)).length;
  const withAllowance = new Set(d.annualAllowances.filter((a) => a.allowance > 0).map((a) => a.user_id));
  const activeBranches = d.branches.filter((b) => b.is_active);
  const branchesWithRoom = new Set(d.rooms.filter((r) => r.is_active).map((r) => r.branch_id));
  const expected = expectedHolidays(d.today, oneYearAfter(d.today));

  return [
    row("branches", activeBranches.filter((b) => !b.location_confirmed_at).length, "/admin/branches"),
    row("birthday", missing("birthday"), "/admin/users?missing=birthday"),
    row("joined", missing("joined"), "/admin/users?missing=joined"),
    row("phone", missing("phone"), "/admin/users?missing=phone"),
    row("branch", missing("branch"), "/admin/users?missing=branch"),
    row("leave", staff.filter((p) => !withAllowance.has(p.id)).length, "/admin/leave"),
    row("hr", d.hrHolders === 0 ? 1 : 0, "/admin/users", d.hrHolders),
    row("rooms", activeBranches.filter((b) => !branchesWithRoom.has(b.id)).length, "/admin/rooms"),
    row("holidays", missingHolidays(expected, d.holidays).length, "/admin/leave"),
    row("gates", d.gateTemplates.filter((g) => g.is_active && g.track_active && !g.owner_id).length, "/gates"),
    row("email", d.emailConfigured ? 0 : 1, null),
    row("push", d.pushConfigured ? 0 : 1, null),
  ];
}
