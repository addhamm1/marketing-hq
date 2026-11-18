import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { U, as } from "./helpers";

// W-17: people change only their own character and saved looks.

const config = { body: "b1", skin: "#c68642", top: "polo", bottom: "jeans", shoes: "loafers" };
const look = (slot: number) => ({ slot, name: `Look ${slot}`, config });

const service = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);

type Row = Database["public"]["Tables"]["avatars"]["Row"];
const users = [U.member, U.member2, U.guest];
let before: Row[] = [];

beforeAll(async () => {
  const { data, error } = await service.from("avatars").select("*").in("user_id", users);
  if (error) throw error;
  before = data ?? [];
  await service.from("avatars").delete().in("user_id", users);
  await service.from("avatars").insert([{ user_id: U.member2, config }]);
});

afterAll(async () => {
  await service.from("avatars").delete().in("user_id", users);
  if (before.length) await service.from("avatars").insert(before);
});

describe("avatars and looks", () => {
  it("a member creates and updates their own character and looks", async () => {
    const member = await as("member");
    const { error: insertError } = await member.from("avatars").insert({ user_id: U.member, config, looks: [look(0)] });
    expect(insertError).toBeNull();
    const { data, error } = await member.from("avatars").update({ looks: [look(0), look(1)] }).eq("user_id", U.member).select("looks");
    expect(error).toBeNull();
    expect(data?.[0].looks).toHaveLength(2);
  });

  it("a member cannot change another person's character or looks", async () => {
    const member = await as("member");
    const { data, error } = await member.from("avatars").update({ looks: [look(0)], config: { ...config, top: "vest" } }).eq("user_id", U.member2).select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const { data: row } = await service.from("avatars").select("config, looks").eq("user_id", U.member2).single();
    expect(row?.looks).toEqual([]);
    expect((row?.config as { top: string }).top).toBe("polo");
  });

  it("a member cannot create a character for someone else", async () => {
    const member = await as("member");
    const { error } = await member.from("avatars").insert({ user_id: U.guest, config });
    expect(error?.code).toBe("42501");
  });

  it("a member cannot hand their row to someone else", async () => {
    const member = await as("member");
    const { error } = await member.from("avatars").update({ user_id: U.guest }).eq("user_id", U.member);
    expect(error).not.toBeNull();
  });

  it("a guest manages only their own row", async () => {
    const guest = await as("guest");
    expect((await guest.from("avatars").insert({ user_id: U.guest, config })).error).toBeNull();
    const { data } = await guest.from("avatars").update({ looks: [look(0)] }).eq("user_id", U.member2).select();
    expect(data).toEqual([]);
  });

  it("the database refuses more than three looks, or looks that are not a list", async () => {
    const member = await as("member");
    const four = [look(0), look(1), look(2), look(0)];
    expect((await member.from("avatars").update({ looks: four }).eq("user_id", U.member)).error?.code).toBe("23514");
    expect((await member.from("avatars").update({ looks: { slot: 0 } }).eq("user_id", U.member)).error?.code).toBe("23514");
  });

  it("signed-out visitors cannot read or write characters", async () => {
    const anon = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
      auth: { persistSession: false },
    });
    const { data } = await anon.from("avatars").select("user_id");
    expect(data ?? []).toEqual([]);
    expect((await anon.from("avatars").insert({ user_id: U.member, config })).error).not.toBeNull();
  });
});
