import { z } from "zod";

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
};

function rolesNeedTeam<T extends { roles: string[]; lead_team_id: string | null }>(v: T) {
  return !v.roles.includes("team_lead") || !!v.lead_team_id;
}

export const createAccountSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(1, "validation.required").email("validation.email"),
    ...userFields,
  })
  .refine(rolesNeedTeam, { path: ["lead_team_id"], message: "validation.required" });

export const updateUserSchema = z
  .object({ user_id: z.uuid(), ...userFields })
  .refine(rolesNeedTeam, { path: ["lead_team_id"], message: "validation.required" });

export const userIdSchema = z.object({ user_id: z.uuid() });
export const setActiveSchema = z.object({ user_id: z.uuid(), active: z.boolean() });

export const branchSchema = z.object({
  id: z.uuid(),
  name_en: z.string().trim().min(1, "validation.required").max(120),
  name_ar: z.string().trim().min(1, "validation.required").max(120),
  area: z.string().trim().max(120),
  map_key: z.string().trim().regex(/^[a-z0-9-]+$/, "validation.invalid"),
  public_ips: z.string().max(2000),
  checkin_methods: z.array(z.enum(["wifi", "qr", "field", "home", "manual"])),
  is_active: z.boolean(),
});

export const settingSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.string().max(10_000),
});

export type CreateAccountInput = z.input<typeof createAccountSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type BranchInput = z.infer<typeof branchSchema>;

export function rolesPayload(roles: readonly string[], leadTeamId: string | null) {
  return roles.map((role) => ({ role, team_id: role === "team_lead" ? leadTeamId : null }));
}
