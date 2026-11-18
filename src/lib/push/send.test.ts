import { afterEach, describe, expect, it, vi } from "vitest";
import { generateVAPIDKeys } from "web-push";
import { webPushSender } from "./send";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function stubKeys(keys: { publicKey: string; privateKey: string }, subject = "https://hq.example.com") {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", keys.publicKey);
  vi.stubEnv("VAPID_PRIVATE_KEY", keys.privateKey);
  vi.stubEnv("VAPID_SUBJECT", subject);
}

describe("webPushSender", () => {
  it("does nothing when the keys are not set", () => {
    stubKeys({ publicKey: "", privateKey: "" }, "");
    expect(webPushSender()).toBeNull();
  });

  it("is ready with valid keys", () => {
    stubKeys(generateVAPIDKeys());
    expect(webPushSender()).toBeTypeOf("function");
  });

  it("treats unusable keys as not configured, without logging them", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    stubKeys({ publicKey: "too-short", privateKey: "secret-value" });
    expect(webPushSender()).toBeNull();
    expect(String(log.mock.calls[0][0])).not.toContain("secret-value");
  });
});
