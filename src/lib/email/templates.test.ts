import { describe, expect, it } from "vitest";
import { renderEmail } from "./templates";

describe("renderEmail", () => {
  it("renders in the recipient's language with an absolute link", () => {
    const en = renderEmail({ kind: "request_decided", locale: "en", name: "Mona", link: "/requests", data: { status: "approved", type_en: "Annual leave", type_ar: "إجازة سنوية" }, appUrl: "https://hq.example" });
    expect(en.subject).toBe("Your request was approved");
    expect(en.html).toContain('href="https://hq.example/en/requests"');
    const ar = renderEmail({ kind: "request_decided", locale: "ar", name: "منى", link: "/requests", data: { status: "approved", type_en: "Annual leave", type_ar: "إجازة سنوية" }, appUrl: "https://hq.example" });
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.text).toContain("إجازة سنوية");
  });

  it("escapes user content", () => {
    const e = renderEmail({ kind: "card_returned", locale: "en", name: "<b>x</b>", link: "/portal", data: { title: "<script>", reason: "a&b" }, appUrl: "https://hq.example" });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });
});
