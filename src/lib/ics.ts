// Calendar files (RFC 5545). Pure: no clock, no environment, safe to unit test.

export type IcsPerson = { name: string; email: string };

export type IcsEvent = {
  /** Stable across edits, so calendars update the event instead of adding a copy. */
  uid: string;
  /** Goes up with every edit. Calendars ignore an update that does not raise it. */
  sequence: number;
  stamp: Date | string;
  start: Date | string;
  end: Date | string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  organizer: IcsPerson;
  attendees?: IcsPerson[];
};

const CRLF = "\r\n";
const MAX_OCTETS = 75;

/** A stable UID for a meeting. */
export function meetingUid(meetingId: string): string {
  return `${meetingId}@marketing-hq.e-spaces.co`;
}

/** 2026-11-20T08:00:00.000Z → 20261120T080000Z */
export function formatUtc(value: Date | string): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Escapes a TEXT value: backslash, semicolon, comma and line breaks. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** A quoted parameter value. Quotes and control characters cannot be escaped there, so they go. */
function paramValue(value: string): string {
  return `"${value.replace(/[\u0000-\u001f\u007f"]/g, " ").trim()}"`;
}

/** Values that are not TEXT (addresses, links) must never carry a line break or a space. */
function bare(value: string): string {
  return value.replace(/[\u0000- \u007f]/g, "");
}

/** Folds a line at 75 octets without splitting a multi-byte character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with one space, which counts towards the limit.
    const limit = parts.length ? MAX_OCTETS - 1 : MAX_OCTETS;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

function person(prop: string, params: string, who: IcsPerson): string {
  return `${prop};CN=${paramValue(who.name)}${params}:mailto:${bare(who.email)}`;
}

/** A complete calendar invitation. */
export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Espaces//Marketing HQ//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${bare(event.uid)}`,
    `SEQUENCE:${Math.max(0, Math.floor(event.sequence))}`,
    `DTSTAMP:${formatUtc(event.stamp)}`,
    `DTSTART:${formatUtc(event.start)}`,
    `DTEND:${formatUtc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    event.url ? `URL:${bare(event.url)}` : null,
    person("ORGANIZER", "", event.organizer),
    ...(event.attendees ?? []).map((a) => person("ATTENDEE", ";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE", a)),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.filter((l): l is string => l !== null).map(foldLine).join(CRLF) + CRLF;
}
