import { describe, expect, it } from "vitest";
import { busyIds, meetingRange, nextSlot, rangeToForm, type BusyRow } from "./time";

const S = "2026-11-20T08:00:00+00:00";
const E = "2026-11-20T08:30:00+00:00";
const row = (kind: string, id: string, starts_at = S, ends_at = E): BusyRow => ({ kind, id, starts_at, ends_at });

describe("meetingRange", () => {
  it("reads the time as Cairo winter time", () => {
    expect(meetingRange("2026-12-20", "10:00", 30)).toEqual({
      starts_at: "2026-12-20T08:00:00.000Z",
      ends_at: "2026-12-20T08:30:00.000Z",
    });
  });

  it("reads the time as Cairo summer time", () => {
    expect(meetingRange("2026-07-20", "10:00", 60).starts_at).toBe("2026-07-20T07:00:00.000Z");
  });

  it("round-trips through the form", () => {
    const r = meetingRange("2026-11-20", "13:15", 45);
    expect(rangeToForm(r.starts_at, r.ends_at)).toEqual({ date: "2026-11-20", time: "13:15", duration: 45 });
  });
});

describe("nextSlot", () => {
  it("rounds up to the next half hour in Cairo", () => {
    expect(nextSlot(new Date("2026-11-18T08:10:00Z"))).toEqual({ date: "2026-11-18", time: "10:30" });
  });

  it("rolls over to tomorrow near midnight", () => {
    expect(nextSlot(new Date("2026-11-18T21:50:00Z"))).toEqual({ date: "2026-11-19", time: "00:00" });
  });
});

describe("busyIds", () => {
  it("collects only the requested kind", () => {
    const rows = [row("room", "r1"), row("user", "u1")];
    expect([...busyIds(rows, "room")]).toEqual(["r1"]);
    expect([...busyIds(rows, "user")]).toEqual(["u1"]);
  });

  it("does not count the meeting being edited against itself", () => {
    const own = { starts_at: S, ends_at: E, room_id: "r1", attendee_ids: ["u1"] };
    expect(busyIds([row("room", "r1")], "room", own).size).toBe(0);
    expect(busyIds([row("user", "u1")], "user", own).size).toBe(0);
  });

  it("matches timestamps written in different formats", () => {
    const own = { starts_at: "2026-11-20T10:00:00+02:00", ends_at: "2026-11-20T10:30:00+02:00", room_id: "r1", attendee_ids: [] };
    expect(busyIds([row("room", "r1")], "room", own).size).toBe(0);
  });

  it("still reports a real clash at another time", () => {
    const own = { starts_at: S, ends_at: E, room_id: "r1", attendee_ids: ["u1"] };
    const later = ["2026-11-20T08:15:00+00:00", "2026-11-20T09:00:00+00:00"] as const;
    expect(busyIds([row("room", "r1", ...later)], "room", own).has("r1")).toBe(true);
    expect(busyIds([row("user", "u1", ...later)], "user", own).has("u1")).toBe(true);
  });

  it("reports someone in a second meeting at the very same time", () => {
    const own = { starts_at: S, ends_at: E, room_id: null, attendee_ids: ["u1"] };
    expect(busyIds([row("user", "u1"), row("user", "u1")], "user", own).has("u1")).toBe(true);
  });

  it("reports a person who is not in the meeting being edited", () => {
    const own = { starts_at: S, ends_at: E, room_id: null, attendee_ids: [] };
    expect(busyIds([row("user", "u2")], "user", own).has("u2")).toBe(true);
  });
});
