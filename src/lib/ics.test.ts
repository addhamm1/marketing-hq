import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine, formatUtc, meetingUid, type IcsEvent } from "./ics";

const event: IcsEvent = {
  uid: meetingUid("6a1f0c52-8a44-4c8b-9d11-0f7c7d7c1a10"),
  sequence: 3,
  stamp: "2026-11-18T09:00:00.000Z",
  start: "2026-11-20T08:00:00+00:00",
  end: "2026-11-20T08:30:00+00:00",
  title: "Plan; review, launch",
  description: "Line one\nLine two",
  location: "Meeting room, HQ",
  url: "https://meet.example.com/abc",
  organizer: { name: "Marketing HQ", email: "marketinghq@e-spaces.co" },
  attendees: [{ name: "Sara Ali", email: "sara@example.com" }],
};

const unfold = (s: string) => s.replace(/\r\n /g, "");
const octets = (s: string) => new TextEncoder().encode(s).length;

describe("buildIcs", () => {
  it("ends every line with CRLF and has no bare line feeds", () => {
    const ics = buildIcs(event);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("is an invitation with the calendar wrapper in order", () => {
    const lines = buildIcs(event).split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("METHOD:REQUEST");
    expect(lines.indexOf("BEGIN:VEVENT")).toBeLessThan(lines.indexOf("END:VEVENT"));
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("writes times in UTC", () => {
    const ics = buildIcs(event);
    expect(ics).toContain("DTSTART:20261120T080000Z");
    expect(ics).toContain("DTEND:20261120T083000Z");
    expect(ics).toContain("DTSTAMP:20261118T090000Z");
  });

  it("converts an offset time to UTC", () => {
    expect(formatUtc("2026-11-20T10:00:00+02:00")).toBe("20261120T080000Z");
  });

  it("keeps the UID stable and carries the sequence", () => {
    const a = buildIcs(event);
    const b = buildIcs({ ...event, sequence: 4, title: "New title", start: "2026-11-21T08:00:00Z", end: "2026-11-21T09:00:00Z" });
    const uid = (s: string) => unfold(s).split("\r\n").find((l) => l.startsWith("UID:"));
    expect(uid(a)).toBe(uid(b));
    expect(uid(a)).toBe("UID:6a1f0c52-8a44-4c8b-9d11-0f7c7d7c1a10@marketing-hq.e-spaces.co");
    expect(b).toContain("SEQUENCE:4");
  });

  it("escapes text values", () => {
    const ics = unfold(buildIcs(event));
    expect(ics).toContain("SUMMARY:Plan\\; review\\, launch");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
    expect(ics).toContain("LOCATION:Meeting room\\, HQ");
  });

  it("omits empty optional fields", () => {
    const ics = buildIcs({ ...event, description: "", location: null, url: undefined });
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("URL:");
  });

  it("cannot be broken out of by a name, address or title", () => {
    const ics = buildIcs({
      ...event,
      title: "Hi\r\nATTENDEE:mailto:evil@example.com",
      attendees: [{ name: 'Eve"\r\nX-EVIL:1', email: "eve@example.com\r\nX-EVIL:2" }],
    });
    const lines = unfold(ics).split("\r\n");
    expect(lines.some((l) => l.startsWith("X-EVIL"))).toBe(false);
    expect(lines.filter((l) => l.startsWith("ATTENDEE"))).toHaveLength(1);
    expect(lines.find((l) => l.startsWith("SUMMARY:"))).toBe("SUMMARY:Hi\\nATTENDEE:mailto:evil@example.com");
  });

  it("folds long lines and unfolds back to the original", () => {
    const title = "A long meeting title ".repeat(12).trim();
    const ics = buildIcs({ ...event, title });
    for (const line of ics.split("\r\n")) expect(octets(line)).toBeLessThanOrEqual(75);
    expect(unfold(ics)).toContain(`SUMMARY:${title}`);
  });
});

describe("escapeText", () => {
  it("escapes the backslash first", () => {
    expect(escapeText("a\\b;c,d")).toBe("a\\\\b\\;c\\,d");
  });

  it("treats every kind of line break the same", () => {
    expect(escapeText("a\r\nb\rc\nd")).toBe("a\\nb\\nc\\nd");
  });
});

describe("foldLine", () => {
  it("leaves a line of exactly 75 octets alone", () => {
    const line = "x".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds at 76 octets with a leading space", () => {
    expect(foldLine("x".repeat(76))).toBe(`${"x".repeat(75)}\r\n x`);
  });

  it("never splits an Arabic character", () => {
    const line = `SUMMARY:${"اجتماع التنسيق الأسبوعي ".repeat(10)}`;
    const folded = foldLine(line);
    for (const part of folded.split("\r\n")) {
      expect(octets(part)).toBeLessThanOrEqual(75);
      expect(part).not.toContain("�");
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("keeps an emoji whole", () => {
    const line = "😀".repeat(40);
    expect(foldLine(line).replace(/\r\n /g, "")).toBe(line);
  });
});
