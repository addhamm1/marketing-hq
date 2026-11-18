import { z } from "zod";

export const KUDOS_MAX = 280;

/** Badges people choose. `birthday` is only ever sent by the one-tap wish. */
export const KUDOS_BADGES = ["teamwork", "creative", "on_time", "helped", "great_idea"] as const;
export const ALL_BADGES = [...KUDOS_BADGES, "birthday"] as const;
export type KudosBadge = (typeof ALL_BADGES)[number];

export const kudosSchema = z.object({
  to_id: z.uuid("celebrations.errors.person"),
  badge: z.enum(KUDOS_BADGES, "celebrations.errors.badge"),
  message: z
    .string()
    .trim()
    .min(1, "celebrations.errors.message")
    .max(KUDOS_MAX, "celebrations.errors.messageTooLong"),
});
export type KudosInput = z.input<typeof kudosSchema>;
export type KudosOutput = z.output<typeof kudosSchema>;

export const wishSchema = z.object({ to_id: z.uuid() });
export const kudosIdSchema = z.object({ id: z.uuid() });
