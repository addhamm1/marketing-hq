import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "@/features/boards/types";
import { addDaysTo } from "@/features/week/days";
import { hasRole, type Access } from "@/lib/auth/access";
import { cairoDateString } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";
import { trackerAction, trackerBucket, type TrackerAction, type TrackerBucket } from "./progress";
import { readDeadlineDay, strategicDeadline, type StrategicDeadline } from "./strategic-deadline";
import { lastMovedAt, type CardTimeline } from "./timeline";

type Client = SupabaseClient<Database>;

export type TrackerRow = {
  id: string;
  title: string;
  stage: Stage | null;
  returned_reason: string | null;
  due_at: string | null;
  stage_due_at: string | null;
  delivered_at: string | null;
  request_kind: Database["public"]["Enums"]["card_request_kind"] | null;
  requester_id: string | null;
  approver_id: string | null;
  last_moved_at: string;
  action: TrackerAction;
  bucket: TrackerBucket;
};

const BUCKET_ORDER: Record<TrackerBucket, number> = { needs_action: 0, in_progress: 1, delivered: 2 };

/** The department's requests, plus any request elsewhere waiting for this person's confirmation. */
export async function fetchTrackerRows(client: Client, access: Access): Promise<TrackerRow[]> {
  const { data: steps, error: stepsError } = await client
    .from("approval_steps")
    .select("subject_id")
    .eq("subject_type", "card")
    .eq("approver_id", access.user_id)
    .eq("status", "active")
    .eq("card_stage", "confirmation");
  if (stepsError) throw stepsError;
  const awaitingMe = new Set(steps.map((s) => s.subject_id));

  const scope = [
    access.department_id ? `requesting_department_id.eq.${access.department_id}` : null,
    awaitingMe.size ? `id.in.(${[...awaitingMe].join(",")})` : null,
  ].filter(Boolean);
  if (!scope.length) return [];

  const { data, error } = await client
    .from("cards")
    .select(
      "id, title, stage, returned_reason, due_at, stage_due_at, delivered_at, request_kind, created_at, requester_id, approver_id, requesting_department_id, card_stage_periods(entered_at)",
    )
    .or(scope.join(","))
    .not("stage", "is", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const viewer = { departmentId: access.department_id, canResubmit: hasRole(access, "requester", "final_approver") };
  return data
    .map(({ card_stage_periods, created_at, requesting_department_id, ...card }) => {
      const action = trackerAction({ ...card, requesting_department_id }, viewer, awaitingMe.has(card.id));
      return { ...card, action, bucket: trackerBucket(card.stage, action), last_moved_at: lastMovedAt(card_stage_periods, created_at) };
    })
    .sort((a, b) => BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket]);
}

/** Only the fields the plain-language timeline needs: never comments or review notes. */
export async function fetchCardTimeline(client: Client, cardId: string): Promise<CardTimeline> {
  const [periods, events] = await Promise.all([
    client.from("card_stage_periods").select("stage, entered_at").eq("card_id", cardId).order("entered_at"),
    client
      .from("card_events")
      .select("kind, from_stage, created_at, decision:data->>decision, to:data->>to")
      .eq("card_id", cardId)
      .in("kind", ["returned", "resubmitted", "approval", "due_change"])
      .order("created_at"),
  ]);
  if (periods.error) throw periods.error;
  if (events.error) throw events.error;
  return { periods: periods.data, events: events.data };
}

export type StrategicStatus = StrategicDeadline & { today: string; submitted: boolean };

/** Monthly plan deadline for departments that submit plans; null for everyone else. */
export async function fetchStrategicStatus(client: Client, access: Access): Promise<StrategicStatus | null> {
  if (!access.department_id || !hasRole(access, "requester", "final_approver")) return null;
  const today = cairoDateString();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [department, setting, holidays] = await Promise.all([
    client.from("departments").select("is_marketing").eq("id", access.department_id).maybeSingle(),
    client.from("settings").select("value").eq("key", "strategic_deadline_day").maybeSingle(),
    client.from("holidays").select("day").eq("is_half_day", false).gte("day", addDaysTo(monthStart, -7)).lte("day", addDaysTo(monthStart, 37)),
  ]);
  if (department.error) throw department.error;
  if (setting.error) throw setting.error;
  if (holidays.error) throw holidays.error;
  if (!department.data || department.data.is_marketing) return null;

  const deadline = strategicDeadline(today, readDeadlineDay(setting.data?.value), new Set(holidays.data.map((h) => h.day)));
  const { data: plans, error } = await client
    .from("strategic_plans")
    .select("id")
    .eq("department_id", access.department_id)
    .eq("for_month", deadline.forMonth)
    .limit(1);
  if (error) throw error;
  return { ...deadline, today, submitted: plans.length > 0 };
}
