import { describe, expect, it } from "vitest";
import { isPushEndpoint } from "./endpoint";
import { renderPush, type PushSource } from "./render";

const note = (over: Partial<PushSource>): PushSource => ({ id: "n1", kind: "meeting_soon", link: "/meetings/1", data: { title: "Stand-up" }, ...over });

describe("isPushEndpoint", () => {
  it("accepts the browser vendors' push services", () => {
    for (const url of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://web.push.apple.com/QabC",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(isPushEndpoint(url), url).toBe(true);
    }
  });

  it("refuses every other address", () => {
    for (const url of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://localhost/hook",
      "https://169.254.169.254/latest/meta-data",
      "https://fcm.googleapis.com.evil.test/x",
      "https://evilpush.apple.com/x",
      "https://fcm.googleapis.com:8443/x",
      "https://user:pw@fcm.googleapis.com/x",
      "not a url",
    ]) {
      expect(isPushEndpoint(url), url).toBe(false);
    }
  });
});

describe("renderPush", () => {
  it("renders in the recipient's language", () => {
    expect(renderPush(note({}), "en").body).toBe("“Stand-up” starts in 15 minutes");
    const ar = renderPush(note({}), "ar");
    expect(ar.body).toContain("Stand-up");
    expect(ar.body).not.toContain("starts in");
    expect(ar).toMatchObject({ dir: "rtl", lang: "ar", link: "/ar/meetings/1" });
  });

  it("prefers the Arabic title for Arabic readers", () => {
    const gate = note({ kind: "gate_due_soon", data: { title: "Gate 5", title_ar: "بوابة 5" } });
    expect(renderPush(gate, "ar").body).toContain("بوابة 5");
    expect(renderPush(gate, "en").body).toContain("Gate 5");
  });

  it("names the person who assigned a card when known", () => {
    const assigned = note({ kind: "assigned", data: { title: "Reel", by: "u1" } });
    expect(renderPush(assigned, "en", "Omar").body).toBe("Omar assigned you to “Reel”");
    expect(renderPush(assigned, "en").body).toBe("You were assigned to “Reel”");
  });

  it("falls back for kinds it does not know", () => {
    expect(renderPush(note({ kind: "something_new" }), "en").body).toBe("You have a new notification");
  });

  it("only ever links inside the site", () => {
    expect(renderPush(note({ link: "https://evil.test/x" }), "en").link).toBe("/en");
    expect(renderPush(note({ link: "//evil.test/x" }), "en").link).toBe("/en");
    expect(renderPush(note({ link: null }), "ar").link).toBe("/ar");
  });

  it("keeps long text within the size push services accept", () => {
    const long = note({ kind: "card_returned", data: { title: "T", reason: "x".repeat(4000) } });
    expect(renderPush(long, "en").body.length).toBeLessThanOrEqual(240);
  });
});
