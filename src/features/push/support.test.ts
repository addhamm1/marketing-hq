import { describe, expect, it } from "vitest";
import { subscriptionSchema } from "./schemas";
import { isIosDevice, pushSupport, vapidKeyBytes, type BrowserFacts } from "./support";

const chrome: BrowserFacts = {
  hasKey: true,
  isIos: false,
  isStandalone: false,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  permission: "default",
};

describe("pushSupport", () => {
  it("is ready on a capable browser", () => {
    expect(pushSupport(chrome)).toBe("ready");
  });

  it("asks iPhone users to add the app to the Home Screen first", () => {
    const safari = { ...chrome, isIos: true, hasPushManager: false, hasNotification: false, permission: null };
    expect(pushSupport(safari)).toBe("install-ios");
  });

  it("is ready on an iPhone once opened from the Home Screen", () => {
    expect(pushSupport({ ...chrome, isIos: true, isStandalone: true })).toBe("ready");
  });

  it("reports browsers without push and blocked permission", () => {
    expect(pushSupport({ ...chrome, hasPushManager: false })).toBe("unsupported");
    expect(pushSupport({ ...chrome, permission: "denied" })).toBe("denied");
  });

  it("says so when the server has no key", () => {
    expect(pushSupport({ ...chrome, hasKey: false })).toBe("unconfigured");
  });
});

describe("isIosDevice", () => {
  it("recognises iPhones and iPads that report as Macs", () => {
    expect(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "iPhone", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0)).toBe(false);
  });
});

describe("vapidKeyBytes", () => {
  it("decodes URL-safe base64 without padding", () => {
    expect([...vapidKeyBytes("-_8")]).toEqual([251, 255]);
  });
});

describe("subscriptionSchema", () => {
  const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "BNc_d-1", auth: "tBHI-tw" };

  it("accepts a browser subscription and trims the user agent", () => {
    const parsed = subscriptionSchema.parse({ ...valid, userAgent: "x".repeat(600) });
    expect(parsed.userAgent).toHaveLength(300);
  });

  it("refuses endpoints outside the push services", () => {
    expect(subscriptionSchema.safeParse({ ...valid, endpoint: "https://intranet.test/hook" }).success).toBe(false);
  });

  it("refuses malformed keys", () => {
    expect(subscriptionSchema.safeParse({ ...valid, auth: "not base64!" }).success).toBe(false);
  });
});
