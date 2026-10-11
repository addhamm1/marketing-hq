import { describe, expect, it } from "vitest";
import { as, service, U } from "./helpers";

const svc = service();

async function approveAll(requestId: string) {
  // Approve every step as its approver (test helper).
  for (let i = 0; i < 5; i++) {
    const { data } = await svc.from("approval_steps").select("id, approver_id").eq("subject_id", requestId).eq("status", "active");
    if (!data?.length) return;
    const emails: Record<string, Parameters<typeof as>[0]> = { [U.leadCreative]: "leadCreative", [U.admin]: "admin", [U.hr]: "hr" };
    const who = emails[data[0].approver_id];
    await (await as(who)).rpc("decide_step", { p_step_id: data[0].id, p_decision: "approved" });
  }
}

describe("team calendar", () => {
  it("a member sees a teammate's leave dates; requesters see only their department", async () => {
    const { data: id } = await (await as("member2")).rpc("submit_request", { type_key: "annual_leave", data: { starts_on: "2027-08-01", ends_on: "2027-08-02", note: "Family trip" } });
    await approveAll(id!);
    const { data: seen } = await (await as("member")).rpc("team_absences", { p_from: "2027-08-01", p_to: "2027-08-31" });
    const row = seen!.find((r) => r.user_id === U.member2);
    expect(row).toMatchObject({ category: "leave", starts_on: "2027-08-01", ends_on: "2027-08-02" });
    expect(Object.keys(row!)).toEqual(["user_id", "category", "starts_on", "ends_on"]);
    const { data: sales } = await (await as("sales")).rpc("team_absences", { p_from: "2027-08-01", p_to: "2027-08-31" });
    expect(sales!.some((r) => r.user_id === U.member2)).toBe(false);
  });
});

describe("request files", () => {
  it("sick leave over 2 days needs a supporting file", async () => {
    const member = await as("member");
    const noFile = await member.rpc("submit_request", { type_key: "sick_leave", data: { starts_on: "2027-09-05", ends_on: "2027-09-08" } });
    expect(noFile.error?.message).toContain("files");
    const bad = await member.rpc("submit_request", { type_key: "sick_leave", data: { starts_on: "2027-09-05", ends_on: "2027-09-08", files: [`requests/${U.member2}/x.pdf`] } });
    expect(bad.error?.message).toContain("invalid_files");
  });

  it("files are readable by the requester and approvers, not by colleagues", async () => {
    const member = await as("member");
    const path = `requests/${U.member}/note-${Date.now()}.txt`;
    const up = await member.storage.from("request-files").upload(path, new Blob(["sick note"], { type: "text/plain" }));
    expect(up.error).toBeNull();
    const intruder = await (await as("member2")).storage.from("request-files").upload(`requests/${U.member}/evil.txt`, new Blob(["x"]));
    expect(intruder.error).not.toBeNull();
    const { error } = await member.rpc("submit_request", { type_key: "sick_leave", data: { starts_on: "2027-09-12", ends_on: "2027-09-15", files: [path] } });
    expect(error).toBeNull();
    const read = async (u: Parameters<typeof as>[0]) => (await (await as(u)).storage.from("request-files").createSignedUrl(path, 60)).error === null;
    expect(await read("member")).toBe(true);
    expect(await read("leadCreative")).toBe(true);
    expect(await read("hr")).toBe(true);
    expect(await read("member2")).toBe(false);
  });
});

describe("avatars", () => {
  it("users write only their own avatar; everyone reads them", async () => {
    const member = await as("member");
    const own = await member.from("avatars").upsert({ user_id: U.member, config: { body: "b1", skin: "#c68642", top: "tshirt", bottom: "pants", shoes: "sneakers" } });
    expect(own.error).toBeNull();
    const other = await member.from("avatars").upsert({ user_id: U.member2, config: {} });
    expect(other.error).not.toBeNull();
    const { data } = await (await as("sales")).from("avatars").select("user_id").eq("user_id", U.member);
    expect(data?.length).toBe(1);
  });
});

describe("leave balances", () => {
  it("hr and super_admin edit allowances; members cannot", async () => {
    const { data: row } = await svc.from("leave_balances").select("id, allowance").eq("user_id", U.member).eq("year", 2027).limit(1).single();
    const no = await (await as("member")).from("leave_balances").update({ allowance: 99 }).eq("id", row!.id).select("id");
    expect(no.data ?? []).toEqual([]);
    const yes = await (await as("hr")).from("leave_balances").update({ allowance: row!.allowance }).eq("id", row!.id).select("id");
    expect(yes.data?.length).toBe(1);
    const { data: seen } = await (await as("member2")).from("leave_balances").select("id").eq("user_id", U.member);
    expect(seen).toEqual([]);
  });
});
