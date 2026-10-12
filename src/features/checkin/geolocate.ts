import { MAX_ACCURACY_M } from "@/lib/geo";
import type { Location } from "./schemas";

export type GeoErrorKind = "denied" | "unavailable" | "timeout" | "low_accuracy" | "unsupported";
export type GeoResult = { ok: true; location: Location } | { ok: false; kind: GeoErrorKind; accuracy?: number };

/**
 * One high-accuracy reading from the browser. Never throws.
 * `strict` rejects readings worse than MAX_ACCURACY_M (branch check-in).
 */
export function geolocate({ timeout = 15_000, strict = true, maximumAge = 0 } = {}): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ ok: false, kind: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) };
        if (strict && location.accuracy > MAX_ACCURACY_M) resolve({ ok: false, kind: "low_accuracy", accuracy: location.accuracy });
        else resolve({ ok: true, location });
      },
      (err) => {
        const kind: GeoErrorKind = err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable";
        resolve({ ok: false, kind });
      },
      { enableHighAccuracy: true, timeout, maximumAge },
    );
  });
}
