import { z } from "zod";

const opt = (max: number) => z.string().trim().max(max, "validation.tooLong");
const uuidOrEmpty = z.union([z.literal(""), z.uuid("validation.uuid")]);

export const lineSchema = z.object({
  title: z.string().trim().min(1, "validation.required").max(200, "validation.tooLong"),
  description: opt(5000),
  objective: opt(2000),
  key_message: opt(2000),
  vertical: opt(120),
  brand_id: uuidOrEmpty,
  format: opt(120),
  platforms: z.array(z.string().max(40)).max(12),
  due_at: z.string(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  reference_links: z.string().max(5000),
  budget_note: opt(500),
});

export const strategicSchema = z.object({
  for_month: z.string().regex(/^\d{4}-\d{2}-01$/),
  lines: z.array(lineSchema).min(1).max(60),
});

const required = (s: z.ZodString) => s.min(1, "validation.required");
export const urgentSchema = lineSchema.extend({
  objective: required(z.string().trim().max(2000, "validation.tooLong")),
  vertical: required(z.string().trim().max(120)),
  brand_id: z.uuid("validation.required"),
  format: required(z.string().trim().max(120)),
  platforms: z.array(z.string().max(40)).min(1, "validation.required").max(12),
  due_at: z.string().min(1, "validation.required"),
  urgent_reason: required(z.string().trim().max(2000, "validation.tooLong")),
});

export const resubmitSchema = lineSchema.extend({ card_id: z.uuid() });

export type LineInput = z.infer<typeof lineSchema>;
export type StrategicInput = z.infer<typeof strategicSchema>;
export type UrgentInput = z.infer<typeof urgentSchema>;

export const emptyLine = (): LineInput => ({
  title: "", description: "", objective: "", key_message: "", vertical: "", brand_id: "", format: "",
  platforms: [], due_at: "", priority: "normal", reference_links: "", budget_note: "",
});
