import { afterEach, describe, expect, it, vi } from "vitest";
import { getCheckinState, getMyDay } from "./queries";
import type { Client } from "./types";

/** A query builder that answers every chained call with one fixed result. */
function builder(result: { data: unknown; error: unknown }) {
  const proxy: object = new Proxy(
    {},
    {
      get: (_, prop) => (prop === "then" ? (resolve: (r: unknown) => void) => resolve(result) : () => proxy),
    },
  );
  return proxy;
}

function fakeClient(failing: string[]) {
  const answer = (name: string) =>
    builder(failing.includes(name) ? { data: null, error: { code: "XX000" } } : { data: [], error: null });
  return { from: answer, rpc: answer } as unknown as Client;
}

afterEach(() => vi.restoreAllMocks());

describe("getMyDay", () => {
  it("keeps the other sections when one query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const day = await getMyDay(fakeClient(["gate_items"]), "user", "2026-11-18");
    expect(day.gates.ok).toBe(false);
    expect(day.meetings.ok && day.cards.ok && day.approvals.ok && day.shoots.ok && day.actions.ok).toBe(true);
  });

  it("uses the celebrations it is given instead of asking the database", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const given = [{ userId: "u", name: "Sara", kind: "birthday" as const, years: null }];
    const day = await getMyDay(fakeClient(["upcoming_celebrations"]), "user", "2026-11-18", { celebrations: given });
    expect(day.celebrations).toEqual({ ok: true, items: given });
  });

  it("logs which section failed without any personal data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await getMyDay(fakeClient(["meeting_actions"]), "user-id-secret", "2026-11-18");
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toContain("section=actions");
    expect(String(log.mock.calls[0][0])).not.toContain("user-id-secret");
  });
});

describe("getCheckinState", () => {
  it("returns null when it cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getCheckinState(fakeClient(["attendance_sessions"]), "user", "2026-11-18")).toBeNull();
  });

  it("reports no session as not checked in", async () => {
    expect(await getCheckinState(fakeClient([]), "user", "2026-11-18")).toMatchObject({ status: "none", at: null });
  });
});
