import type { Stage } from "@/features/boards/types";

export type PortalStatus = "received" | "in_production" | "awaiting_approval" | "delivered" | "returned";

/** Simplified status shown to requesting departments (PRODUCT_SPEC.md section 3). */
export function portalStatus(stage: Stage | null, returnedReason: string | null): PortalStatus {
  switch (stage) {
    case "request":
      return returnedReason ? "returned" : "received";
    case "performance_input":
    case "intake":
    case "brief_schedule":
      return "received";
    case "production":
    case "creative_review":
      return "in_production";
    case "confirmation":
      return "awaiting_approval";
    default:
      return "delivered";
  }
}

export const PORTAL_STATUS_STYLE: Record<PortalStatus, string> = {
  received: "bg-slate-100 text-slate-700",
  in_production: "bg-sky-50 text-sky-700",
  awaiting_approval: "bg-amber-50 text-amber-800",
  delivered: "bg-emerald-50 text-emerald-700",
  returned: "bg-rose-50 text-rose-700",
};
