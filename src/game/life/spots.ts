import { type Places, type Spot, hasPlace } from "./places";
import { ACTIVITY_PLACE, type ActivityKind } from "./plan";
import { type Rng, pick } from "./rng";

/** Does this map have somewhere for `kind` to happen? Desk activities and chats always can. */
export function canHappen(places: Places, kind: ActivityKind): boolean {
  const place = ACTIVITY_PLACE[kind];
  if (place) return hasPlace(places, place.kind);
  if (kind === "wander") return places.open.length > 0;
  return true;
}

/**
 * A random free spot for `kind`: seats or floor as the activity prefers,
 * falling back to any free spot of that place; open floor for wandering.
 */
export function pickSpot(places: Places, kind: ActivityKind, rng: Rng, taken: (s: Spot) => boolean): Spot | null {
  const place = ACTIVITY_PLACE[kind];
  const free = (spots: Spot[]) => spots.filter((s) => !taken(s));
  if (!place) return pick(rng, free(places.open)) ?? null;
  const seats = free(places.seats[place.kind]);
  const floor = free(places.floor[place.kind]);
  const first = place.on === "floor" ? floor : place.on === "seat" ? seats : [...seats, ...floor];
  return pick(rng, first.length ? first : [...seats, ...floor]) ?? null;
}
