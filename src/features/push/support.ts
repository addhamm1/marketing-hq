export type PushSupport = "ready" | "unconfigured" | "install-ios" | "unsupported" | "denied";

export type BrowserFacts = {
  hasKey: boolean;
  isIos: boolean;
  isStandalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission: "default" | "granted" | "denied" | null;
};

/** What this device can do about phone notifications, most blocking reason first. */
export function pushSupport(facts: BrowserFacts): PushSupport {
  if (!facts.hasKey) return "unconfigured";
  // iPhone offers web push only to apps added to the Home Screen.
  if (facts.isIos && !facts.isStandalone) return "install-ios";
  if (!facts.hasServiceWorker || !facts.hasPushManager || !facts.hasNotification) return "unsupported";
  return facts.permission === "denied" ? "denied" : "ready";
}

/** iPadOS reports itself as a Mac, so touch support tells the two apart. */
export function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

/** The public key in the binary form the browser's subscribe call needs. */
export function vapidKeyBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + "=".repeat((4 - (key.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
