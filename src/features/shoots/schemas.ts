import { z } from "zod";

export const SHOOT_STATUSES = ["planned", "confirmed", "wrapped", "cancelled"] as const;
export type ShootStatus = (typeof SHOOT_STATUSES)[number];

// Every transform below accepts its own output: the form parses once and the action again.
const optionalUuid = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v == null || v.trim() === "" || v === "none" ? null : v.trim()))
  .pipe(z.uuid("validation.uuid").nullable());

function isRealDate(v: string) {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.required").refine(isRealDate, "validation.invalid");

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "validation.invalid")
  .transform((v) => v.slice(0, 5));

const optionalTime = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v || null)
  .pipe(time.nullable());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "validation.tooLong")
    .nullable()
    .optional()
    .transform((v) => v || null);

const mapLink = z
  .string()
  .trim()
  .max(500, "validation.tooLong")
  .nullable()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "shoots.errors.mapLink");

export const shootSchema = z
  .object({
    title: z.string().trim().min(1, "validation.required").max(160, "validation.tooLong"),
    shoot_on: isoDate,
    call_time: time,
    wrap_time: optionalTime,
    place: z.enum(["branch", "outside"]),
    branch_id: optionalUuid,
    location_name: optionalText(160),
    location_url: mapLink,
    status: z.enum(SHOOT_STATUSES),
    producer_id: optionalUuid,
    brief: z.string().trim().max(6000, "validation.tooLong"),
    backup_plan: z.string().trim().max(2000, "validation.tooLong"),
  })
  .superRefine((v, ctx) => {
    if (v.place === "branch" && !v.branch_id) ctx.addIssue({ code: "custom", path: ["branch_id"], message: "validation.required" });
    if (v.place === "outside" && !v.location_name) ctx.addIssue({ code: "custom", path: ["location_name"], message: "validation.required" });
    if (v.wrap_time && v.wrap_time <= v.call_time) ctx.addIssue({ code: "custom", path: ["wrap_time"], message: "shoots.errors.wrapAfterCall" });
  });

export type ShootInput = z.input<typeof shootSchema>;
export type ShootOutput = z.output<typeof shootSchema>;

/** Form values to table columns: a shoot is at a branch or outside, never both. */
export function shootRow({ place, ...v }: ShootOutput) {
  return {
    ...v,
    branch_id: place === "branch" ? v.branch_id : null,
    location_name: place === "outside" ? v.location_name : null,
  };
}

export const shootIdSchema = z.object({ id: z.uuid() });
export const shootStatusSchema = z.object({ id: z.uuid(), status: z.enum(SHOOT_STATUSES) });

const inShoot = { shoot_id: z.uuid() };
export const rowRefSchema = z.object({ id: z.uuid(), ...inShoot });

export const crewAddSchema = z
  .object({
    ...inShoot,
    kind: z.enum(["member", "outside"]),
    user_id: optionalUuid,
    external_name: optionalText(120),
    role: z.string().trim().max(80, "validation.tooLong"),
    call_time: optionalTime,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "member" && !v.user_id) ctx.addIssue({ code: "custom", path: ["user_id"], message: "validation.required" });
    if (v.kind === "outside" && !v.external_name) ctx.addIssue({ code: "custom", path: ["external_name"], message: "validation.required" });
  });

export const crewUpdateSchema = z.object({
  id: z.uuid(),
  ...inShoot,
  role: z.string().trim().max(80, "validation.tooLong"),
  call_time: optionalTime,
  confirmed: z.boolean(),
});

const shotFields = {
  description: z.string().trim().min(1, "validation.required").max(500, "validation.tooLong"),
  shot_type: z.string().trim().max(60, "validation.tooLong"),
  notes: z.string().trim().max(1000, "validation.tooLong"),
  card_id: optionalUuid,
};
export const shotAddSchema = z.object({ ...inShoot, ...shotFields });
export const shotUpdateSchema = z.object({ id: z.uuid(), ...inShoot, ...shotFields });
export const shotDoneSchema = z.object({ id: z.uuid(), ...inShoot, done: z.boolean() });
export const shotOrderSchema = z.object({ ...inShoot, ids: z.array(z.uuid()).min(1).max(500) });

const quantity = z.coerce.number("validation.invalid").int("validation.invalid").min(1, "validation.invalid").max(999, "validation.invalid");
export const equipmentAddSchema = z.object({
  ...inShoot,
  item: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
  quantity,
  owner_id: optionalUuid,
});
export const equipmentUpdateSchema = z.object({
  id: z.uuid(),
  ...inShoot,
  quantity,
  owner_id: optionalUuid,
  packed: z.boolean(),
  returned: z.boolean(),
});

export const shootCardSchema = z.object({ ...inShoot, card_id: z.uuid() });
export const cardSearchSchema = z.object({ q: z.string().trim().min(2).max(80) });
