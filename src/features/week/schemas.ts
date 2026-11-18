import { z } from "zod";
import { parseDay } from "./days";

const day = z.string().refine((v) => parseDay(v) !== null, "validation.invalid");

export const planEntrySchema = z
  .object({
    user_id: z.uuid("validation.uuid"),
    day,
    kind: z.enum(["branch", "field", "home", "away"]),
    branch_id: z.union([z.literal(""), z.uuid("validation.uuid")]),
    place: z.string().trim().max(120, "validation.tooLong"),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "branch" && !value.branch_id) {
      ctx.addIssue({ code: "custom", path: ["branch_id"], message: "validation.required" });
    }
    if (value.kind === "field" && !value.place) {
      ctx.addIssue({ code: "custom", path: ["place"], message: "validation.required" });
    }
  });

export const clearPlanSchema = z.object({ user_id: z.uuid("validation.uuid"), day });
export const copyWeekSchema = z.object({ week: day });

export type PlanEntryInput = z.input<typeof planEntrySchema>;
