/**
 * Location check-in maths. The database repeats the same check in check_in()
 * (public._distance_m), so the server action and SQL always agree.
 */

const EARTH_RADIUS_M = 6_371_008.8;

/** Worst accuracy accepted for a branch check-in, in metres. */
export const MAX_ACCURACY_M = 200;
/** At most this much of the reported accuracy is added to the geofence radius. */
export const ACCURACY_ALLOWANCE_CAP_M = 100;

export type LatLng = { lat: number; lng: number };
export type GeoBranch = { id: string; latitude: number | null; longitude: number | null; geofence_radius_m: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Radius plus the accuracy allowance (capped). */
export function allowedDistanceM(radiusM: number, accuracyM: number): number {
  return radiusM + Math.min(Math.max(accuracyM, 0), ACCURACY_ALLOWANCE_CAP_M);
}

export type NearestResult<B extends GeoBranch> =
  | { kind: "inside"; branch: B; distanceM: number }
  | { kind: "outside"; branch: B; distanceM: number }
  | { kind: "none" };

/** The nearest branch with coordinates, and whether the position is inside its geofence. */
export function nearestBranch<B extends GeoBranch>(position: LatLng & { accuracyM: number }, branches: B[]): NearestResult<B> {
  let best: { branch: B; distanceM: number } | null = null;
  for (const b of branches) {
    if (b.latitude === null || b.longitude === null) continue;
    const d = distanceM(position, { lat: b.latitude, lng: b.longitude });
    if (!best || d < best.distanceM) best = { branch: b, distanceM: d };
  }
  if (!best) return { kind: "none" };
  const inside = best.distanceM <= allowedDistanceM(best.branch.geofence_radius_m, position.accuracyM);
  return { kind: inside ? "inside" : "outside", ...best };
}

/** "30.09600,31.32600" for exports; 5 decimals is about 1 m. */
export function formatLatLng(lat: number | null, lng: number | null): string {
  return lat === null || lng === null ? "" : `${lat.toFixed(5)},${lng.toFixed(5)}`;
}
