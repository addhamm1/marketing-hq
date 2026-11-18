import { z } from "zod";
import { birthdayFields, checkBirthday, staffDetailFields } from "@/features/launch/birthday";

export const APP_ROLES = [
  "super_admin", "leadership", "team_lead", "traffic_manager", "member",
  "requester", "final_approver", "hr", "guest",
] as const;

// Accepts "", "none" or null for "no value"; idempotent on its own output.
const optionalUuid = z
  .string()
  .nullable()
  .transform((v) => (v == null || v.trim() === "" || v === "none" ? null : v.trim()))
  .pipe(z.uuid("validation.uuid").nullable());

const time = z.string().regex(/^\d{2}:\d{2}$/, "validation.invalid");

export const roleEntrySchema = z.object({
  role: z.enum(APP_ROLES),
  team_id: z.uuid().nullable().optional(),
});

export const scheduleSchema = z.object({
  workdays: z.array(z.number().int().min(0).max(6)).min(1, "validation.required"),
  start_time: time,
  end_time: time,
});

const userFields = {
  full_name: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
  department_id: optionalUuid,
  team_id: optionalUuid,
  home_branch_id: optionalUuid,
  title: z.string().trim().max(120, "validation.tooLong"),
  roles: z.array(z.enum(APP_ROLES)),
  lead_team_id: optionalUuid,
  ...scheduleSchema.shape,
  ...staffDetailFields,
  ...birthdayFields,
};

function rolesNeedTeam<T extends { roles: string[]; lead_team_id: string | null }>(v: T) {
  return !v.roles.includes("team_lead") || !!v.lead_team_id;
}

export const createAccountSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(1, "validation.required").email("validation.email"),
    ...userFields,
  })
  .refine(rolesNeedTeam, { path: ["lead_team_id"], message: "validation.required" })
  .superRefine(checkBirthday);

export const updateUserSchema = z
  .object({ user_id: z.uuid(), ...userFields })
  .refine(rolesNeedTeam, { path: ["lead_team_id"], message: "validation.required" })
  .superRefine(checkBirthday);

export const userIdSchema = z.object({ user_id: z.uuid() });
export const setActiveSchema = z.object({ user_id: z.uuid(), active: z.boolean() });

/** Check-in methods an admin can enable ('qr' is retired, 'manual' is HR only). */
export const CHECKIN_METHODS = ["gps", "wifi", "field", "home"] as const;

function coordinate(min: number, max: number, message: string) {
  return z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v === null || (typeof v === "string" && v.trim() === "") ? null : Number(v)))
    .pipe(z.number(message).min(min, message).max(max, message).nullable());
}

export const branchSchema = z.object({
  id: z.uuid(),
  name_en: z.string().trim().min(1, "validation.required").max(120),
  name_ar: z.string().trim().min(1, "validation.required").max(120),
  area: z.string().trim().max(120),
  map_key: z.string().trim().regex(/^[a-z0-9-]+$/, "validation.invalid"),
  public_ips: z.string().max(2000),
  checkin_methods: z.array(z.enum(CHECKIN_METHODS)),
  is_active: z.boolean(),
  // Empty string = no coordinates (location check-in off for the branch).
  latitude: coordinate(-90, 90, "validation.latitude"),
  longitude: coordinate(-180, 180, "validation.longitude"),
  geofence_radius_m: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" && v.trim() === "" ? Number.NaN : Number(v)))
    .pipe(z.number("validation.radius").int("validation.radius").min(25, "validation.radius").max(2000, "validation.radius")),
}).refine((v) => (v.latitude === null) === (v.longitude === null), { path: ["longitude"], message: "validation.coordinatesPair" });

export const settingSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.string().max(10_000),
});

export type CreateAccountInput = z.input<typeof createAccountSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type BranchInput = z.input<typeof branchSchema>;
export type BranchOutput = z.output<typeof branchSchema>;

export function rolesPayload(roles: readonly string[], leadTeamId: string | null) {
  return roles.map((role) => ({ role, team_id: role === "team_lead" ? leadTeamId : null }));
}
