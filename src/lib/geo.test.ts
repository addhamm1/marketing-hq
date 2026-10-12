import { describe, expect, it } from "vitest";
import { allowedDistanceM, distanceM, formatLatLng, nearestBranch } from "./geo";

const hq = { id: "hq", latitude: 30.096, longitude: 31.326, geofence_radius_m: 150 };
const korba = { id: "korba", latitude: 30.0897, longitude: 31.3233, geofence_radius_m: 150 };
const alex = { id: "alex", latitude: 31.2156, longitude: 29.9553, geofence_radius_m: 150 };
const noCoords = { id: "x", latitude: null, longitude: null, geofence_radius_m: 150 };

describe("distanceM", () => {
  it("is zero for the same point", () => {
    expect(distanceM({ lat: 30, lng: 31 }, { lat: 30, lng: 31 })).toBe(0);
  });

  it("measures one degree of latitude as about 111 km", () => {
    expect(distanceM({ lat: 30, lng: 31 }, { lat: 31, lng: 31 })).toBeCloseTo(111_195, -2);
  });

  it("measures Cairo to Alexandria as about 180 km", () => {
    const d = distanceM({ lat: 30.0444, lng: 31.2357 }, { lat: 31.2001, lng: 29.9187 });
    expect(d / 1000).toBeGreaterThan(175);
    expect(d / 1000).toBeLessThan(185);
  });

  it("is symmetric", () => {
    const a = { lat: 30.1, lng: 31.3 };
    const b = { lat: 29.97, lng: 31.27 };
    expect(distanceM(a, b)).toBeCloseTo(distanceM(b, a), 6);
  });
});

describe("allowedDistanceM", () => {
  it("adds the accuracy, capped at 100 m", () => {
    expect(allowedDistanceM(150, 20)).toBe(170);
    expect(allowedDistanceM(150, 180)).toBe(250);
    expect(allowedDistanceM(150, -5)).toBe(150);
  });
});

describe("nearestBranch", () => {
  it("picks the nearest branch and says when the position is inside", () => {
    const r = nearestBranch({ lat: 30.0961, lng: 31.3261, accuracyM: 10 }, [korba, hq, alex, noCoords]);
    expect(r.kind).toBe("inside");
    if (r.kind !== "none") expect(r.branch.id).toBe("hq");
  });

  it("says outside with the distance when out of range", () => {
    // About 500 m north of hq.
    const r = nearestBranch({ lat: 30.1005, lng: 31.326, accuracyM: 10 }, [hq, alex]);
    expect(r.kind).toBe("outside");
    if (r.kind === "outside") expect(Math.round(r.distanceM / 10) * 10).toBe(500);
  });

  it("accepts a position just outside the radius when accuracy covers it", () => {
    // About 200 m from hq: outside 150 m, inside 150 + 60.
    const p = { lat: 30.0978, lng: 31.326 };
    expect(nearestBranch({ ...p, accuracyM: 10 }, [hq]).kind).toBe("outside");
    expect(nearestBranch({ ...p, accuracyM: 60 }, [hq]).kind).toBe("inside");
  });

  it("returns none when no branch has coordinates", () => {
    expect(nearestBranch({ lat: 30, lng: 31, accuracyM: 5 }, [noCoords]).kind).toBe("none");
    expect(nearestBranch({ lat: 30, lng: 31, accuracyM: 5 }, []).kind).toBe("none");
  });
});

describe("formatLatLng", () => {
  it("formats with five decimals, empty when missing", () => {
    expect(formatLatLng(30.096, 31.326)).toBe("30.09600,31.32600");
    expect(formatLatLng(null, null)).toBe("");
  });
});
