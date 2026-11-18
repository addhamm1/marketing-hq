import type { Stage } from "@/features/boards/types";
import { portalStatus } from "@/features/portal/status";

/** The five steps a requesting department sees, in order. */
export const TRACKER_STEPS = ["received", "in_review", "in_production", "confirmation", "delivered"] as const;
export type TrackerStep = (typeof TRACKER_STEPS)[number];

export type TrackerAction = "resubmit" | "confirm" | null;
export type TrackerBucket = "needs_action" | "in_progress" | "delivered";

export type TrackerCard = {
  stage: Stage | null;
  returned_reason: string | null;
  requesting_department_id: string | null;
};

export type TrackerViewer = { departmentId: string | null; canResubmit: boolean };

/** Internal stages folded into plain steps, refining portalStatus with an "in review" step. */
export function trackerStep(stage: Stage | null): TrackerStep {
  switch (portalStatus(stage, null)) {
    case "received":
      return stage === "intake" || stage === "brief_schedule" ? "in_review" : "received";
    case "in_production":
      return "in_production";
    case "awaiting_approval":
      return "confirmation";
    default:
      return "delivered";
  }
}

export function isReturned(card: Pick<TrackerCard, "stage" | "returned_reason">) {
  return portalStatus(card.stage, card.returned_reason) === "returned";
}

/**
 * What this person must do now. Anyone in the requesting department may fix a returned
 * request; a confirmation belongs only to the person whose approval step is open.
 */
export function trackerAction(card: TrackerCard, viewer: TrackerViewer, awaitingMe: boolean): TrackerAction {
  if (isReturned(card)) {
    return viewer.canResubmit && !!viewer.departmentId && card.requesting_department_id === viewer.departmentId ? "resubmit" : null;
  }
  return awaitingMe && card.stage === "confirmation" ? "confirm" : null;
}

export function trackerBucket(stage: Stage | null, action: TrackerAction): TrackerBucket {
  if (action) return "needs_action";
  return trackerStep(stage) === "delivered" ? "delivered" : "in_progress";
}
