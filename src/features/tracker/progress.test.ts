import { describe, expect, it } from "vitest";
import { trackerAction, trackerBucket, trackerStep, type TrackerCard } from "./progress";

const card = (over: Partial<TrackerCard>): TrackerCard => ({
  stage: "production",
  returned_reason: null,
  requesting_department_id: "sales",
  ...over,
});
const colleague = { departmentId: "sales", canResubmit: true };

describe("trackerStep", () => {
  it("folds every internal stage into a plain step", () => {
    expect(trackerStep("request")).toBe("received");
    expect(trackerStep("performance_input")).toBe("received");
    expect(trackerStep("intake")).toBe("in_review");
    expect(trackerStep("brief_schedule")).toBe("in_review");
    expect(trackerStep("production")).toBe("in_production");
    expect(trackerStep("creative_review")).toBe("in_production");
    expect(trackerStep("confirmation")).toBe("confirmation");
    expect(trackerStep("ready_to_publish")).toBe("delivered");
    expect(trackerStep("published")).toBe("delivered");
    expect(trackerStep("reported")).toBe("delivered");
  });
});

describe("trackerAction", () => {
  it("asks anyone in the department to fix a returned request", () => {
    expect(trackerAction(card({ stage: "request", returned_reason: "Missing copy" }), colleague, false)).toBe("resubmit");
  });

  it("does not ask someone who cannot resubmit it", () => {
    const returned = card({ stage: "request", returned_reason: "Missing copy" });
    expect(trackerAction(returned, { departmentId: "hr", canResubmit: true }, false)).toBeNull();
    expect(trackerAction(returned, { departmentId: "sales", canResubmit: false }, false)).toBeNull();
  });

  it("asks for confirmation only from the person whose step is open", () => {
    expect(trackerAction(card({ stage: "confirmation" }), colleague, true)).toBe("confirm");
    expect(trackerAction(card({ stage: "confirmation" }), colleague, false)).toBeNull();
  });

  it("ignores an open step left over after the card moved on", () => {
    expect(trackerAction(card({ stage: "production" }), colleague, true)).toBeNull();
  });

  it("no longer asks once a request has been resubmitted", () => {
    expect(trackerAction(card({ stage: "performance_input" }), colleague, false)).toBeNull();
  });
});

describe("trackerBucket", () => {
  it("sorts requests into the three filters", () => {
    expect(trackerBucket("request", "resubmit")).toBe("needs_action");
    expect(trackerBucket("confirmation", "confirm")).toBe("needs_action");
    expect(trackerBucket("confirmation", null)).toBe("in_progress");
    expect(trackerBucket("production", null)).toBe("in_progress");
    expect(trackerBucket("ready_to_publish", null)).toBe("delivered");
  });
});
