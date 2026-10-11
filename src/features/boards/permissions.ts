import { hasRole, isGuestOnly, type Access } from "@/lib/auth/access";
import type { Board } from "./types";

/** What the board UI offers. The database enforces the real rules. */
export type BoardPerms = {
  editBoard: boolean;
  addCards: boolean;
  addLists: boolean;
  reorderLists: boolean;
  isTraffic: boolean;
  isAdmin: boolean;
  isTeamLead: boolean;
  isPerformanceLead: boolean;
  isCommunity: boolean;
  isWriter: boolean;
};

export function boardPermissions(access: Access, board: Board): BoardPerms {
  const isAdmin = hasRole(access, "super_admin");
  const isTraffic = hasRole(access, "traffic_manager");
  const isTeamLead = hasRole(access, "team_lead");
  const isWriter = access.is_marketing && hasRole(access, "super_admin", "team_lead", "traffic_manager", "member");
  const guest = isGuestOnly(access);
  const creator = board.created_by === access.user_id;
  const editBoard = !board.is_pipeline && !guest && isWriter && (isAdmin || isTraffic || isTeamLead || creator);
  return {
    editBoard,
    addCards: board.is_pipeline ? isTraffic || isAdmin : guest || isWriter,
    addLists: !board.is_pipeline && (editBoard || (isWriter && board.visibility === "marketing")),
    reorderLists: !board.is_pipeline && (editBoard || (isWriter && board.visibility === "marketing")),
    isTraffic,
    isAdmin,
    isTeamLead,
    isPerformanceLead: access.roles.some((r) => r.role === "team_lead" && r.team_slug === "performance"),
    isCommunity: access.team_slug === "community",
    isWriter,
  };
}
