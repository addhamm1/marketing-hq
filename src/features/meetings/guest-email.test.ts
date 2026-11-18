import { describe, expect, it } from "vitest";
import { renderGuestInvite } from "./guest-email";
import { meetingPlace, meetingSequence, organizerAddress } from "./meeting-ics";

const input = {
  locale: "en" as const,
  guestName: "Sara",
  organizerName: "Adham",
  title: "Launch plan",
  startsAt: "2026-11-20T08:00:00Z",
  endsAt: "2026-11-20T08:30:00Z",
  place: "Meeting room",
  onlineUrl: "https://meet.example.com/abc",
  agenda: "Budget",
  isUpdate: false,
};

describe("renderGuestInvite", () => {
  it("gives the time in Cairo", () => {
    const { text } = renderGuestInvite(input);
    expect(text).toContain("10:00 – 10:30");
    expect(text).toContain("Cairo time");
  });

  it("says when the details changed", () => {
    expect(renderGuestInvite(input).subject).toBe("Invitation: Launch plan");
    expect(renderGuestInvite({ ...input, isUpdate: true }).subject).toBe("New time or place: Launch plan");
  });

  it("escapes what people typed", () => {
    const { html } = renderGuestInvite({ ...input, title: "<script>alert(1)</script>", agenda: '"><img src=x>', guestName: "<b>Sara</b>" });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>Sara");
    expect(html).toContain("&lt;script&gt;");
  });

  it("leaves out what the meeting does not have", () => {
    const { text } = renderGuestInvite({ ...input, place: "", onlineUrl: null, agenda: "" });
    expect(text).not.toContain("Where");
    expect(text).not.toContain("Online link");
    expect(text).not.toContain("Agenda");
  });

  it("writes Arabic right to left", () => {
    const { html, subject } = renderGuestInvite({ ...input, locale: "ar" });
    expect(html).toContain('dir="rtl"');
    expect(subject).toBe("دعوة: Launch plan");
  });
});

describe("organizerAddress", () => {
  it("reads the address out of a display name", () => {
    expect(organizerAddress("Marketing HQ <hq@example.com>")).toBe("hq@example.com");
  });

  it("accepts a bare address", () => {
    expect(organizerAddress("hq@example.com")).toBe("hq@example.com");
  });

  it("falls back when the setting is missing or malformed", () => {
    expect(organizerAddress("")).toBe("marketinghq@e-spaces.co");
    expect(organizerAddress("not an address")).toBe("marketinghq@e-spaces.co");
  });
});

describe("meetingPlace", () => {
  const rooms = { name_en: "Studio", name_ar: "الاستوديو" };

  it("uses the room name in the reader's language", () => {
    expect(meetingPlace({ meeting_rooms: rooms, location_text: null }, "ar")).toBe("الاستوديو");
  });

  it("joins the room and the free-text place", () => {
    expect(meetingPlace({ meeting_rooms: rooms, location_text: "Floor 2" }, "en")).toBe("Studio, Floor 2");
  });

  it("is empty when there is neither", () => {
    expect(meetingPlace({ meeting_rooms: null, location_text: null }, "en")).toBe("");
  });
});

describe("meetingSequence", () => {
  it("starts at zero and rises with each edit", () => {
    const created = "2026-11-18T09:00:00Z";
    expect(meetingSequence(created, created)).toBe(0);
    expect(meetingSequence(created, "2026-11-18T09:00:30Z")).toBe(30);
    expect(meetingSequence(created, "2026-11-18T10:00:00Z")).toBeGreaterThan(30);
  });

  it("stays inside the format's integer range for years", () => {
    expect(meetingSequence("2026-01-01T00:00:00Z", "2046-01-01T00:00:00Z")).toBeLessThan(2 ** 31);
  });
});
