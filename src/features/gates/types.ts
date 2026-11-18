import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];

export type GateKind = Database["public"]["Enums"]["gate_kind"];
export type GateStatus = Database["public"]["Enums"]["gate_status"];
export type GateItem = Tables["gate_items"]["Row"];
export type GateTrack = Tables["gate_tracks"]["Row"];
export type GateTemplate = Tables["gate_templates"]["Row"];

export type LinkedCard = { item_id: string; card_id: string; title: string };

export const GATE_KINDS = ["phase", "gate", "checkpoint", "recurring"] as const;
export const GATE_STATUSES = ["not_started", "in_progress", "done", "at_risk", "missed", "skipped"] as const;

/** Statuses that still need someone to act. */
export const OPEN_STATUSES: readonly GateStatus[] = ["not_started", "in_progress", "at_risk"];

/** Saturday to Thursday: Friday is off, and templates cannot recur on it. */
export const WORK_WEEKDAYS = [6, 0, 1, 2, 3, 4] as const;

export type GatePerms = { canManage: boolean; userId: string };
