import { z } from "zod";

// Birthdays are a month and a day, never a year. 29 February is a real birthday.
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(month: number | null | undefined) {
  return month && month >= 1 && month <= 12 ? MONTH_DAYS[month - 1] : 31;
}

export function isValidBirthday(month: number, day: number) {
  return Number.isInteger(month) && Number.isInteger(day) && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(month);
}

// "", "none" and null all mean no value. Accepts its own output.
const smallNumber = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((v) => (v === null || v === undefined || v === "" || v === "none" ? null : Number(v)))
  .pipe(z.number("validation.invalid").int("validation.invalid").nullable());

export const birthdayFields = { birth_month: smallNumber, birth_day: smallNumber };

/** Both or neither, and a day that exists in that month (no 31 February). */
export function checkBirthday(v: { birth_month: number | null; birth_day: number | null }, ctx: z.RefinementCtx) {
  const { birth_month: month, birth_day: day } = v;
  if (month === null && day === null) return;
  if (month === null) return ctx.addIssue({ code: "custom", path: ["birth_month"], message: "validation.required" });
  if (day === null) return ctx.addIssue({ code: "custom", path: ["birth_day"], message: "validation.required" });
  if (!isValidBirthday(month, day)) ctx.addIssue({ code: "custom", path: ["birth_day"], message: "launch.birthday.invalid" });
}

export const myBirthdaySchema = z.object({ ...birthdayFields, celebrate: z.boolean() }).superRefine(checkBirthday);
export type MyBirthdayInput = z.input<typeof myBirthdaySchema>;
export type MyBirthdayOutput = z.output<typeof myBirthdaySchema>;

export function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Joining date and phone as an admin edits them. Empty means not set. */
export const staffDetailFields = {
  phone: z.string().trim().max(30, "validation.tooLong").nullable().optional().transform((v) => v || null),
  joined_on: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || (isRealDate(v) && v >= "1970-01-01"), "validation.invalid"),
};
