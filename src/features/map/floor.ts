import type { MapSelection, MapSession } from "./types";

/** "field" and "home" are shared virtual floors; every other floor is a branch. */
export function isBranchFloor(selection: MapSelection): boolean {
  return selection !== "field" && selection !== "home";
}

/** The floor a check-in puts someone on, matching the database's `_branch_topic`. */
export function floorOf(session: Pick<MapSession, "branch_id" | "method"> | undefined): MapSelection | null {
  if (!session) return null;
  return session.branch_id ?? (session.method === "home" ? "home" : "field");
}

/** Can the viewer interact with `userId` on the floor being viewed? Both must be checked in on it. */
export function bothOnFloor(sessions: MapSession[], viewerId: string, userId: string, selection: MapSelection): boolean {
  const floor = (id: string) => floorOf(sessions.find((s) => s.user_id === id));
  return floor(viewerId) === selection && floor(userId) === selection;
}
