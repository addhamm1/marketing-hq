import { describe, expect, it } from "vitest";
import { meetingErrorKey, meetingFailure } from "./errors";
import { meetingSchema, seriesSchema, type MeetingInput, type SeriesInput } from "./schemas";

const meeting: MeetingInput = {
  id: null,
  title: "Launch plan",
  agenda: "",
  date: "2026-11-20",
  time: "10:00",
  duration: 30,
  room_id: "",
  location_text: "",
  online_url: "",
  is_private: false,
  attendee_ids: [],
  guests: [],
};

const series: SeriesInput = {
  id: null,
  title: "Stand-up",
  title_ar: "",
  agenda: "",
  cadence: "daily",
  weekdays: [],
  month_days: [],
  start_time: "10:15",
  duration_minutes: 15,
  room_id: "",
  online_url: "",
  owner_id: "",
  audience: "marketing",
  member_ids: [],
  starts_on: "2026-11-21",
  ends_on: "",
};

const issue = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, path: string) =>
  r.error?.issues.find((i) => i.path.join(".") === path)?.message;

describe("meetingSchema", () => {
  it("accepts a plain meeting", () => {
    expect(meetingSchema.safeParse(meeting).success).toBe(true);
  });

  it("needs a title", () => {
    expect(issue(meetingSchema.safeParse({ ...meeting, title: "   " }), "title")).toBe("validation.required");
  });

  it("refuses a date that does not exist", () => {
    expect(issue(meetingSchema.safeParse({ ...meeting, date: "2026-02-31" }), "date")).toBe("validation.invalid");
  });

  it("refuses an online link that is not http or https", () => {
    expect(issue(meetingSchema.safeParse({ ...meeting, online_url: "javascript:alert(1)" }), "online_url")).toBe("meetings.errors.bad_url");
  });

  it("normalises a guest email", () => {
    const r = meetingSchema.parse({ ...meeting, guests: [{ name: " Sara ", email: " Sara@Example.COM " }] });
    expect(r.guests[0]).toEqual({ name: "Sara", email: "sara@example.com" });
  });

  it("refuses the same guest twice, whatever the case", () => {
    const guests = [{ name: "A", email: "a@example.com" }, { name: "B", email: "A@example.com" }];
    expect(issue(meetingSchema.safeParse({ ...meeting, guests }), "guests.1.email")).toBe("meetings.errors.duplicate_guest");
  });

  it("refuses a bad guest email beside its row", () => {
    const r = meetingSchema.safeParse({ ...meeting, guests: [{ name: "A", email: "nope" }] });
    expect(issue(r, "guests.0.email")).toBe("validation.email");
  });
});

describe("seriesSchema", () => {
  it("accepts a daily meeting with no days chosen", () => {
    expect(seriesSchema.safeParse(series).success).toBe(true);
  });

  it("needs a weekday for a weekly meeting", () => {
    expect(issue(seriesSchema.safeParse({ ...series, cadence: "weekly" }), "weekdays")).toBe("meetings.errors.pick_weekday");
  });

  it("needs a day of the month for a monthly meeting", () => {
    expect(issue(seriesSchema.safeParse({ ...series, cadence: "monthly" }), "month_days")).toBe("meetings.errors.pick_month_day");
  });

  it("refuses Friday", () => {
    expect(seriesSchema.safeParse({ ...series, cadence: "weekly", weekdays: [5] }).success).toBe(false);
  });

  it("refuses an end before the start", () => {
    expect(issue(seriesSchema.safeParse({ ...series, ends_on: "2026-11-01" }), "ends_on")).toBe("meetings.errors.ends_before_start");
  });
});

describe("meetingErrorKey", () => {
  it("maps a room clash", () => {
    expect(meetingErrorKey({ code: "23P01", message: "conflicting key value violates exclusion constraint" })).toBe("meetings.errors.room_taken");
  });

  it("maps raised errors", () => {
    expect(meetingErrorKey({ code: "P0001", message: "in_the_past" })).toBe("meetings.errors.in_the_past");
    expect(meetingErrorKey({ code: "22023", message: "title_required" })).toBe("meetings.errors.title_required");
    expect(meetingErrorKey({ code: "P0001", message: "no_actions_board" })).toBe("meetings.errors.no_actions_board");
  });

  it("maps refusals and unknown errors", () => {
    expect(meetingErrorKey({ code: "42501", message: "not allowed" })).toBe("common.notAllowed");
    expect(meetingErrorKey({ code: "P0002", message: "not found" })).toBe("meetings.errors.not_found");
    expect(meetingErrorKey({ code: "XX000", message: "boom" })).toBe("common.unknownError");
    expect(meetingErrorKey(null)).toBe("common.unknownError");
  });

  it("puts a room clash beside the room field", () => {
    expect(meetingFailure({ code: "23P01" }).fieldErrors).toEqual({ room_id: "meetings.errors.room_taken" });
  });

  it("puts a past date beside the date field", () => {
    expect(meetingFailure({ message: "in_the_past" }).fieldErrors).toEqual({ date: "meetings.errors.in_the_past" });
  });

  it("has no field for a general refusal", () => {
    expect(meetingFailure({ code: "42501" }).fieldErrors).toBeUndefined();
  });
});
