import { z } from "zod";
import { isRealDate } from "./birthday";

/** A lowercase key made from a name: letters, digits and single hyphens. */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const nameEn = z.string().trim().min(1, "validation.required").max(80, "validation.tooLong");
const nameAr = z.string().trim().min(1, "validation.required").max(80, "validation.tooLong");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "validation.invalid");
const day = z.string().refine(isRealDate, "validation.required");

// A comma-separated field in the form, a list after parsing. Accepts its own output.
const itemIds = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.string().regex(/^[a-z0-9-]{1,40}$/, "seasonsAdmin.errors.item")).max(12, "seasonsAdmin.errors.tooMany"));

export const seasonSchema = z
  .object({ name_en: nameEn, name_ar: nameAr, starts_on: day, ends_on: day, items: itemIds, is_active: z.boolean() })
  .refine((v) => v.ends_on >= v.starts_on, { path: ["ends_on"], message: "seasonsAdmin.errors.dates" });
export type SeasonInput = z.input<typeof seasonSchema>;
export type SeasonOutput = z.output<typeof seasonSchema>;

export const departmentSchema = z.object({ id: z.uuid().optional(), name_en: nameEn, name_ar: nameAr });
export const teamAddSchema = z.object({ department_id: z.uuid("validation.required"), name_en: nameEn, name_ar: nameAr, color });
export const brandSchema = z.object({ id: z.uuid().optional(), name: nameEn, color });
export const branchAddSchema = z.object({
  name_en: nameEn,
  name_ar: nameAr,
  area: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
});
export const roomSchema = z.object({
  id: z.uuid().optional(),
  branch_id: z.uuid("validation.required"),
  name_en: nameEn,
  name_ar: nameAr,
  capacity: z.coerce.number("validation.invalid").int("validation.invalid").min(1, "validation.invalid").max(500, "validation.invalid"),
  is_active: z.boolean(),
});
export type RoomInput = z.input<typeof roomSchema>;

export const requestTypeAddSchema = z.object({
  name_en: nameEn,
  name_ar: nameAr,
  category: z.enum(["leave", "special"]),
  counts_working_days: z.boolean(),
});
export type RequestTypeAddInput = z.input<typeof requestTypeAddSchema>;

const allowanceTarget = { type_id: z.uuid(), year: z.number().int().min(2020).max(2100) };
export const allowancePreviewSchema = z.object(allowanceTarget);
export const allowanceApplySchema = z.object({
  ...allowanceTarget,
  allowance: z.number().min(0).max(365),
  overwrite: z.boolean(),
  confirmed: z.literal(true),
});
