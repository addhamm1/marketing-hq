import { z } from "zod";

const REQUIRED = "validation.required";
const TOO_LONG = "validation.tooLong";

export const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "validation.uuid");

function isRealDate(value: string) {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, REQUIRED).refine(isRealDate, "validation.invalid");
const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, REQUIRED);
const optionalUuid = z.union([uuid, z.literal("")]);
const optionalDate = z.union([dateField, z.literal("")]);

const onlineUrl = z
  .string()
  .trim()
  .max(2000, TOO_LONG)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "meetings.errors.bad_url");

export const guestSchema = z.object({
  name: z.string().trim().min(1, REQUIRED).max(120, TOO_LONG),
  email: z.string().trim().toLowerCase().max(254, TOO_LONG).pipe(z.email("validation.email")),
});

export const meetingSchema = z
  .object({
    id: uuid.nullable(),
    title: z.string().trim().min(1, REQUIRED).max(120, TOO_LONG),
    agenda: z.string().max(4000, TOO_LONG),
    date: dateField,
    time: timeField,
    duration: z.number().int().min(5, "validation.invalid").max(720, "validation.invalid"),
    room_id: optionalUuid,
    location_text: z.string().trim().max(160, TOO_LONG),
    online_url: onlineUrl,
    is_private: z.boolean(),
    attendee_ids: z.array(uuid).max(200),
    guests: z.array(guestSchema).max(30, "meetings.errors.too_many_guests"),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.guests.forEach((guest, index) => {
      if (seen.has(guest.email)) {
        ctx.addIssue({ code: "custom", path: ["guests", index, "email"], message: "meetings.errors.duplicate_guest" });
      }
      seen.add(guest.email);
    });
  });
export type MeetingInput = z.input<typeof meetingSchema>;

export const respondSchema = z.object({ id: uuid, response: z.enum(["accepted", "tentative", "declined"]) });
export const idSchema = z.object({ id: uuid });
export const notesSchema = z.object({ id: uuid, notes: z.string().max(20000, TOO_LONG) });

export const actionItemSchema = z.object({
  meeting_id: uuid,
  title: z.string().trim().min(1, REQUIRED).max(200, TOO_LONG),
  assignee_id: optionalUuid,
  due_on: optionalDate,
});
export type ActionItemInput = z.input<typeof actionItemSchema>;

export const actionItemPatchSchema = z.object({
  id: uuid,
  patch: z
    .object({
      title: z.string().trim().min(1, REQUIRED).max(200, TOO_LONG),
      assignee_id: optionalUuid,
      due_on: optionalDate,
      done: z.boolean(),
    })
    .partial(),
});

export const seriesSchema = z
  .object({
    id: uuid.nullable(),
    title: z.string().trim().min(1, REQUIRED).max(120, TOO_LONG),
    title_ar: z.string().trim().max(120, TOO_LONG),
    agenda: z.string().max(4000, TOO_LONG),
    cadence: z.enum(["daily", "weekly", "monthly"]),
    weekdays: z.array(z.number().int().refine((d) => [0, 1, 2, 3, 4, 6].includes(d), "validation.invalid")),
    month_days: z.array(z.number().int().min(1).max(31)),
    start_time: timeField,
    duration_minutes: z.number().int().min(5, "validation.invalid").max(480, "validation.invalid"),
    room_id: optionalUuid,
    online_url: onlineUrl,
    owner_id: optionalUuid,
    audience: z.enum(["marketing", "custom"]),
    member_ids: z.array(uuid).max(200),
    starts_on: dateField,
    ends_on: optionalDate,
  })
  .superRefine((value, ctx) => {
    if (value.cadence === "weekly" && !value.weekdays.length) {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "meetings.errors.pick_weekday" });
    }
    if (value.cadence === "monthly" && !value.month_days.length) {
      ctx.addIssue({ code: "custom", path: ["month_days"], message: "meetings.errors.pick_month_day" });
    }
    if (value.ends_on && value.ends_on < value.starts_on) {
      ctx.addIssue({ code: "custom", path: ["ends_on"], message: "meetings.errors.ends_before_start" });
    }
  });
export type SeriesInput = z.input<typeof seriesSchema>;

export const roomSchema = z.object({
  id: uuid.nullable(),
  name_en: z.string().trim().min(1, REQUIRED).max(80, TOO_LONG),
  name_ar: z.string().trim().min(1, REQUIRED).max(80, TOO_LONG),
  capacity: z.number().int().min(1, "validation.invalid").max(500, "validation.invalid"),
  branch_id: optionalUuid,
  is_active: z.boolean(),
});
export type RoomInput = z.input<typeof roomSchema>;
