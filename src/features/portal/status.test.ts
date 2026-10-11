import { describe, expect, it } from "vitest";
import { portalStatus } from "./status";

describe("portalStatus", () => {
  it("maps stages to the simplified statuses", () => {
    expect(portalStatus("request", null)).toBe("received");
    expect(portalStatus("request", "Missing copy")).toBe("returned");
    expect(portalStatus("brief_schedule", null)).toBe("received");
    expect(portalStatus("creative_review", null)).toBe("in_production");
    expect(portalStatus("confirmation", null)).toBe("awaiting_approval");
    expect(portalStatus("published", null)).toBe("delivered");
  });
});
