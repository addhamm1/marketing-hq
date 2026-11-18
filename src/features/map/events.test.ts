import { describe, expect, it } from "vitest";
import { celebrateEvent, interactErrorOf, interactEvent, moveEvent } from "./events";
import { bothOnFloor, floorOf, isBranchFloor } from "./floor";
import type { MapSession } from "./types";

const ME = "00000000-0000-4000-8000-000000000006";
const YOU = "00000000-0000-4000-8000-000000000007";
const HQ = "30000000-0000-4000-8000-000000000001";
const OTHER = "30000000-0000-4000-8000-000000000002";

const session = (user_id: string, branch_id: string | null, method = "wifi"): MapSession => ({
  user_id, branch_id, method, checked_in_at: "2026-11-18T08:00:00Z", field_card_id: null, note: null, checkin_place: null,
});

describe("realtime payloads", () => {
  it("accepts what the database sends", () => {
    expect(moveEvent.safeParse({ user_id: ME, x: 4, y: 9 }).success).toBe(true);
    expect(interactEvent.safeParse({ from: ME, to: YOU, kind: "wave" }).success).toBe(true);
    expect(interactEvent.safeParse({ from: ME, to: null, kind: "dance" }).success).toBe(true);
    expect(celebrateEvent.safeParse({ user_id: ME, kind: "kudos", badge: "teamwork" }).success).toBe(true);
  });

  it("drops anything malformed", () => {
    expect(moveEvent.safeParse({ user_id: ME, x: -1, y: 9 }).success).toBe(false);
    expect(moveEvent.safeParse({ user_id: ME, x: 1.5, y: 9 }).success).toBe(false);
    expect(moveEvent.safeParse({ user_id: "me", x: 1, y: 9 }).success).toBe(false);
    expect(interactEvent.safeParse({ from: ME, to: YOU, kind: "punch" }).success).toBe(false);
  });
});

describe("interactErrorOf", () => {
  it("recognises each refusal", () => {
    expect(interactErrorOf("rate_limited")).toBe("rate_limited");
    expect(interactErrorOf("not_here")).toBe("not_here");
    expect(interactErrorOf("not_checked_in")).toBe("not_checked_in");
  });

  it("falls back for anything else", () => {
    expect(interactErrorOf("not allowed")).toBe("unknown");
    expect(interactErrorOf(undefined)).toBe("unknown");
  });
});

describe("floors", () => {
  it("names the floor a check-in puts someone on", () => {
    expect(floorOf(session(ME, HQ))).toBe(HQ);
    expect(floorOf(session(ME, null, "field"))).toBe("field");
    expect(floorOf(session(ME, null, "home"))).toBe("home");
    expect(floorOf(undefined)).toBeNull();
  });

  it("tells branches from the virtual floors", () => {
    expect(isBranchFloor(HQ)).toBe(true);
    expect(isBranchFloor("field")).toBe(false);
    expect(isBranchFloor("home")).toBe(false);
  });

  it("needs both people on the floor being viewed", () => {
    const here = [session(ME, HQ), session(YOU, HQ)];
    expect(bothOnFloor(here, ME, YOU, HQ)).toBe(true);
    expect(bothOnFloor(here, ME, YOU, OTHER)).toBe(false);
    expect(bothOnFloor([session(ME, HQ), session(YOU, OTHER)], ME, YOU, HQ)).toBe(false);
    expect(bothOnFloor([session(YOU, HQ)], ME, YOU, HQ)).toBe(false);
    expect(bothOnFloor([session(ME, HQ)], ME, YOU, HQ)).toBe(false);
  });
});
