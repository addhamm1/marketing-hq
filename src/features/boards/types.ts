import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Stage = Enums["card_stage"];
export type Priority = Enums["card_priority"];
export type AssigneeRole = Enums["assignee_role"];
export type RevisionReason = Enums["revision_reason"];

export const STAGES: Stage[] = [
  "request", "performance_input", "intake", "brief_schedule", "production",
  "creative_review", "confirmation", "ready_to_publish", "published", "reported",
];
export const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];
export const ASSIGNEE_ROLES: AssigneeRole[] = ["design", "copy", "video", "media_buying", "other"];
export const REVISION_REASONS: RevisionReason[] = ["brief_changed", "quality", "new_information", "other"];

export type Board = {
  id: string;
  name: string;
  description: string;
  is_pipeline: boolean;
  visibility: "marketing" | "private";
  workspace_id: string;
  created_by: string | null;
  archived_at: string | null;
};

export type BoardList = { id: string; name: string; position: string; stage: Stage | null };

export type BoardCard = {
  id: string;
  list_id: string;
  position: string;
  title: string;
  stage: Stage | null;
  priority: Priority;
  due_at: string | null;
  stage_due_at: string | null;
  stage_entered_at: string | null;
  brand_id: string | null;
  revision_count: number;
  request_kind: Enums["card_request_kind"] | null;
  requesting_department_id: string | null;
  vertical: string | null;
  format: string | null;
  platforms: string[];
  reviewer_id: string | null;
  approver_id: string | null;
  is_late_submission: boolean;
  assignees: { user_id: string; role: AssigneeRole }[];
  label_ids: string[];
  checklist: { done: number; total: number };
  comment_count: number;
  attachment_count: number;
};

export type Label = { id: string; name: string; color: string };
export type Person = { id: string; display_name: string; title: string | null; team_id: string | null; department_id: string | null };
export type Brand = { id: string; name: string; slug: string; color: string };

export type BoardData = { board: Board; lists: BoardList[]; cards: BoardCard[]; labels: Label[] };
