import type { MapCharacter } from "@/game";
import type { MapData, MapSelection } from "./types";

/**
 * Who stands where on the selected map: checked-in users at their assigned
 * desk, or the first free desk; field and home maps use spot-1..n.
 */
export function placeCharacters(
  data: Pick<MapData, "sessions" | "people" | "desks" | "teamColors" | "onLeaveToday">,
  selection: MapSelection,
  zones: string[],
): (Omit<MapCharacter, "sheet"> & { checkedInAt: string })[] {
  const virtual = selection === "field" || selection === "home";
  const here = data.sessions.filter((s) =>
    virtual ? s.branch_id === null && s.method === selection : s.branch_id === selection,
  );
  const people = new Map(data.people.map((p) => [p.id, p]));
  const spots = zones.filter((z) => (virtual ? /^spot-\d+$/.test(z) : /^desk-\d+$/.test(z)))
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
  const assigned = new Map<string, string>(); // user -> desk
  const taken = new Set<string>();
  if (!virtual) {
    for (const d of data.desks) {
      if (d.branch_id === selection && d.assigned_user_id && spots.includes(d.zone_name)) assigned.set(d.assigned_user_id, d.zone_name);
    }
  }
  const out: (Omit<MapCharacter, "sheet"> & { checkedInAt: string })[] = [];
  // Assigned desks first so free desks are handed out after.
  const ordered = [...here].sort((a, b) => Number(assigned.has(b.user_id)) - Number(assigned.has(a.user_id)));
  for (const s of ordered) {
    const p = people.get(s.user_id);
    if (!p) continue;
    let spot = assigned.get(s.user_id);
    if (!spot || taken.has(spot)) spot = spots.find((z) => !taken.has(z) && ![...assigned.values()].includes(z)) ?? spots.find((z) => !taken.has(z));
    if (!spot) continue;
    taken.add(spot);
    out.push({
      userId: p.id,
      name: p.name,
      teamColor: (p.teamId && data.teamColors[p.teamId]) || "#64748B",
      status: p.presence,
      spot,
      checkedInAt: s.checked_in_at,
    });
  }
  // A sign at the desk of anyone on approved leave today (D5-05).
  if (!virtual) {
    for (const userId of data.onLeaveToday) {
      const desk = assigned.get(userId);
      const p = people.get(userId);
      if (desk && p && !taken.has(desk)) {
        out.push({ userId, name: p.name, teamColor: "#94A3B8", status: "away", spot: desk, onLeave: true, checkedInAt: "" });
      }
    }
  }
  return out;
}
