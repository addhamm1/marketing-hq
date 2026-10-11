import { z } from "zod";
import { ASSIGNEE_ROLES, PRIORITIES, REVISION_REASONS, STAGES } from "./types";

const id = z.uuid();
const position = z.string().min(1).max(64).regex(/^[0-9A-Za-z]+$/);
const nullableUuid = z.uuid().nullable();
const isoOrNull = z
  .string()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "validation.invalid");

export const createBoardSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
  workspace_id: id,
  visibility: z.enum(["marketing", "private"]),
});
export const updateBoardSchema = z.object({
  id,
  name: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong").optional(),
  visibility: z.enum(["marketing", "private"]).optional(),
  description: z.string().max(2000).optional(),
});
export const idSchema = z.object({ id });
export const boardMemberSchema = z.object({ board_id: id, user_id: id });

export const createListSchema = z.object({
  board_id: id,
  name: z.string().trim().min(1, "validation.required").max(80, "validation.tooLong"),
  position,
});
export const updateListSchema = z.object({
  id,
  name: z.string().trim().min(1, "validation.required").max(80, "validation.tooLong").optional(),
  position: position.optional(),
});

export const createCardSchema = z.object({
  board_id: id,
  list_id: id,
  title: z.string().trim().min(1, "validation.required").max(200, "validation.tooLong"),
  position,
});
export const moveCardSchema = z.object({ id, list_id: id, position });
export const moveStageSchema = z.object({
  id,
  to: z.enum(STAGES as [string, ...string[]]),
  position: position.optional(),
  payload: z
    .object({
      stage_due_at: z.string().optional(),
      assignees: z.array(z.object({ user_id: id, role: z.enum(ASSIGNEE_ROLES as [string, ...string[]]) })).optional(),
      performance_notes: z.string().max(5000).optional(),
      no_input: z.boolean().optional(),
      returned_reason: z.string().max(2000).optional(),
      missing_items: z.array(z.string().max(200)).max(30).optional(),
    })
    .default({}),
});

export const updateCardSchema = z.object({
  id,
  title: z.string().trim().min(1, "validation.required").max(200, "validation.tooLong").optional(),
  description: z.string().max(20_000, "validation.tooLong").optional(),
  objective: z.string().max(2000, "validation.tooLong").nullable().optional(),
  key_message: z.string().max(2000, "validation.tooLong").nullable().optional(),
  reference_links: z.array(z.string().url("validation.invalid").max(2000)).max(20).optional(),
  performance_notes: z.string().max(5000, "validation.tooLong").nullable().optional(),
  vertical: z.string().max(120).nullable().optional(),
  brand_id: nullableUuid.optional(),
  branch_id: nullableUuid.optional(),
  format: z.string().max(120).nullable().optional(),
  platforms: z.array(z.string().max(40)).max(12).optional(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).optional(),
  due_at: isoOrNull.optional(),
  stage_due_at: isoOrNull.optional(),
  budget_note: z.string().max(500).nullable().optional(),
});

export const assigneesSchema = z.object({
  card_id: id,
  assignees: z.array(z.object({ user_id: id, role: z.enum(ASSIGNEE_ROLES as [string, ...string[]]) })).max(20),
});
export const cardLabelsSchema = z.object({ card_id: id, label_ids: z.array(id).max(30) });
export const createLabelSchema = z.object({
  board_id: id,
  name: z.string().trim().min(1, "validation.required").max(40, "validation.tooLong"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const createChecklistSchema = z.object({
  card_id: id,
  title: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
});
export const addItemSchema = z.object({
  checklist_id: id,
  text: z.string().trim().min(1, "validation.required").max(300, "validation.tooLong"),
  position,
});
export const toggleItemSchema = z.object({ id, done: z.boolean() });

export const commentSchema = z.object({
  card_id: id,
  body: z.string().trim().min(1, "validation.required").max(5000, "validation.tooLong"),
  mentions: z.array(id).max(20).default([]),
});
export const editCommentSchema = z.object({
  id,
  body: z.string().trim().min(1, "validation.required").max(5000, "validation.tooLong"),
  mentions: z.array(id).max(20).default([]),
});

export const uploadUrlSchema = z.object({
  card_id: id,
  file_name: z.string().trim().min(1).max(200),
});
export const registerAttachmentSchema = z.object({
  card_id: id,
  path: z.string().min(1).max(500),
  name: z.string().trim().min(1).max(255),
  mime: z.string().max(120).nullable(),
  size: z.number().int().nonnegative().max(104_857_600),
});
export const linkSchema = z.object({
  card_id: id,
  url: z.string().url("validation.invalid").max(2000),
  name: z.string().trim().min(1, "validation.required").max(255),
});

export const reviewersSchema = z.object({ card_id: id, reviewer_id: nullableUuid, approver_id: nullableUuid });

export const decideSchema = z.object({
  step_id: id,
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  comment: z.string().trim().max(2000).optional(),
  reason: z.enum(REVISION_REASONS as [string, ...string[]]).optional(),
});
