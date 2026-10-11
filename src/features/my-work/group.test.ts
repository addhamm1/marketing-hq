import { describe, expect, it } from "vitest";
import { dueGroup } from "./group";

describe("dueGroup", () => {
  const now = new Date("2026-10-12T09:00:00Z"); // 12:00 in Cairo
  it("buckets by Cairo calendar day", () => {
    expect(dueGroup(null, now)).toBe("noDate");
    expect(dueGroup("2026-10-12T08:00:00Z", now)).toBe("overdue");
    expect(dueGroup("2026-10-12T20:30:00Z", now)).toBe("today"); // 23:30 Cairo
    expect(dueGroup("2026-10-12T21:30:00Z", now)).toBe("thisWeek"); // 00:30 next day in Cairo
    expect(dueGroup("2026-10-18T10:00:00Z", now)).toBe("thisWeek");
    expect(dueGroup("2026-10-25T10:00:00Z", now)).toBe("later");
  });
});
