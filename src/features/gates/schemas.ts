import { z } from "zod";
import { isIsoDate, isMonth } from "./month";
import { GATE_KINDS, GATE_STATUSES, WORK_WEEKDAYS } from "./types";

const optionalUuid = z
  .string()
  .nullable()
  .transform((v) => (v == null || v === "" || v === "none" ? null : v))
  .pipe(z.uuid("validation.uuid").nullable());

const text = (max: number) => z.string().trim().min(1, "validation.required").max(max, "validation.tooLong");
const date = z.string().refine(isIsoDate, "validation.required");
const note = z.string().trim().max(2000, "validation.tooLong");
const order = z.number("validation.required").int("validation.invalid").min(0, "validation.invalid").max(999, "validation.invalid");
const day = z.number("validation.required").int("gates.errors.dayRange").min(1, "gates.errors.dayRange").max(31, "gates.errors.dayRange");

export const itemSchema = z
  .object({
    id: z.uuid().nullable(),
    month: z.string().refine(isMonth, "validation.invalid"),
    track_id: z.uuid("validation.uuid"),
    kind: z.enum(GATE_KINDS),
    name_en: text(160),
    name_ar: text(160),
    starts_on: date,
    due_on: date,
    owner_id: optionalUuid,
    status: z.enum(GATE_STATUSES),
    note,
  })
  // Only phases run across several days.
  .transform((v) => (v.kind === "phase" ? v : { ...v, starts_on: v.due_on }))
  .refine((v) => v.due_on >= v.starts_on, { path: ["due_on"], message: "gates.errors.dueBeforeStart" });

export type ItemValues = z.input<typeof itemSchema>;
export type ItemOutput = z.output<typeof itemSchema>;

export const statusSchema = z.object({ id: z.uuid(), status: z.enum(GATE_STATUSES), note });
export type StatusValues = z.infer<typeof statusSchema>;

export const idSchema = z.uuid();
export const cardLinkSchema = z.object({ item_id: z.uuid(), card_id: z.uuid() });
export const cardSearchSchema = z.string().trim().min(2).max(80);

export const trackSchema = z.object({
  id: z.uuid().nullable(),
  name_en: text(80),
  name_ar: text(80),
  subtitle_en: z.string().trim().max(120, "validation.tooLong"),
  subtitle_ar: z.string().trim().max(120, "validation.tooLong"),
  position: order,
  is_active: z.boolean(),
});
export type TrackValues = z.infer<typeof trackSchema>;

export const templateSchema = z
  .object({
    id: z.uuid().nullable(),
    track_id: z.uuid("validation.uuid"),
    kind: z.enum(GATE_KINDS),
    name_en: text(160),
    name_ar: text(160),
    start_day: day,
    end_day: day,
    weekdays: z.array(z.number().int().refine((d) => (WORK_WEEKDAYS as readonly number[]).includes(d), "validation.invalid")),
    owner_id: optionalUuid,
    position: order,
    is_active: z.boolean(),
  })
  .transform((v) => ({
    ...v,
    end_day: v.kind === "gate" || v.kind === "checkpoint" ? v.start_day : v.end_day,
    weekdays: v.kind === "recurring" ? v.weekdays : [],
  }))
  .refine((v) => v.end_day >= v.start_day, { path: ["end_day"], message: "gates.errors.endBeforeStart" })
  .refine((v) => v.kind !== "recurring" || v.weekdays.length > 0, { path: ["weekdays"], message: "gates.errors.weekdaysRequired" });

export type TemplateValues = z.input<typeof templateSchema>;
export type TemplateOutput = z.output<typeof templateSchema>;

/** A stable key for a new track, built from its English name. */
export function trackKey(nameEn: string, suffix: string): string {
  const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${slug || "track"}-${suffix}`;
}
