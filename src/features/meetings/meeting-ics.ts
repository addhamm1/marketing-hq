import { buildIcs, meetingUid, type IcsPerson } from "@/lib/ics";

export type IcsMeeting = {
  id: string;
  title: string;
  agenda: string;
  starts_at: string;
  ends_at: string;
  location_text: string | null;
  online_url: string | null;
  created_at: string;
  updated_at: string;
  meeting_rooms: { name_en: string; name_ar: string } | null;
};

const DEFAULT_ADDRESS = "marketinghq@e-spaces.co";

/** The sending address from EMAIL_FROM ("Name <address>"). Staff addresses stay out of the file. */
export function organizerAddress(from: string | undefined = process.env.EMAIL_FROM): string {
  const address = from?.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] ?? from?.trim();
  return address && /^[^@\s]+@[^@\s]+$/.test(address) ? address : DEFAULT_ADDRESS;
}

/** Room, then the free-text place. */
export function meetingPlace(meeting: Pick<IcsMeeting, "location_text" | "meeting_rooms">, locale: "en" | "ar") {
  const room = meeting.meeting_rooms ? (locale === "ar" ? meeting.meeting_rooms.name_ar : meeting.meeting_rooms.name_en) : null;
  return [room, meeting.location_text].filter(Boolean).join(", ");
}

/** Seconds since creation: always rises with an edit and stays inside the format's integer range. */
export function meetingSequence(createdAt: string, updatedAt: string) {
  return Math.max(0, Math.floor((Date.parse(updatedAt) - Date.parse(createdAt)) / 1000));
}

export function meetingIcs(meeting: IcsMeeting, organizerName: string, attendee: IcsPerson, locale: "en" | "ar") {
  return buildIcs({
    uid: meetingUid(meeting.id),
    sequence: meetingSequence(meeting.created_at, meeting.updated_at),
    stamp: meeting.updated_at,
    start: meeting.starts_at,
    end: meeting.ends_at,
    title: meeting.title,
    description: [meeting.agenda, meeting.online_url].filter(Boolean).join("\n\n"),
    location: meetingPlace(meeting, locale) || meeting.online_url,
    url: meeting.online_url,
    organizer: { name: organizerName, email: organizerAddress() },
    attendees: [attendee],
  });
}
