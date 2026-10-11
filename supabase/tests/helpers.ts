import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const PASSWORD = "Test1234!";

/** Fixed ids from supabase/seed/02_users.sql. */
export const U = {
  admin: "00000000-0000-4000-8000-000000000001",
  leadership: "00000000-0000-4000-8000-000000000002",
  traffic: "00000000-0000-4000-8000-000000000003",
  leadCreative: "00000000-0000-4000-8000-000000000004",
  leadPerformance: "00000000-0000-4000-8000-000000000005",
  member: "00000000-0000-4000-8000-000000000006",
  member2: "00000000-0000-4000-8000-000000000007",
  community: "00000000-0000-4000-8000-000000000008",
  sales: "00000000-0000-4000-8000-000000000009",
  approver: "00000000-0000-4000-8000-000000000010",
  hr: "00000000-0000-4000-8000-000000000011",
  guest: "00000000-0000-4000-8000-000000000012",
  inactive: "00000000-0000-4000-8000-000000000013",
  norole: "00000000-0000-4000-8000-000000000014",
  newhire: "00000000-0000-4000-8000-000000000015",
} as const;

export const EMAIL: Record<keyof typeof U, string> = {
  admin: "admin@test.local",
  leadership: "leadership@test.local",
  traffic: "traffic@test.local",
  leadCreative: "lead.creative@test.local",
  leadPerformance: "lead.performance@test.local",
  member: "member@test.local",
  member2: "member2@test.local",
  community: "community@test.local",
  sales: "sales@test.local",
  approver: "approver@test.local",
  hr: "hr@test.local",
  guest: "guest@test.local",
  inactive: "inactive@test.local",
  norole: "norole@test.local",
  newhire: "newhire@test.local",
};

export const BRANCH_HQ = "30000000-0000-4000-8000-000000000001";
export const DEPT = {
  marketing: "10000000-0000-4000-8000-000000000001",
  sales: "10000000-0000-4000-8000-000000000002",
};
export const TEAM = {
  traffic: "20000000-0000-4000-8000-000000000001",
  creative: "20000000-0000-4000-8000-000000000002",
  performance: "20000000-0000-4000-8000-000000000003",
  community: "20000000-0000-4000-8000-000000000004",
};

const cache = new Map<string, Promise<Client>>();

/** A client signed in as a seeded test user (cached per user). */
export function as(user: keyof typeof U): Promise<Client> {
  const email = EMAIL[user];
  if (!cache.has(email)) {
    cache.set(
      email,
      (async () => {
        const client = createClient<Database>(url(), anonKey(), {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
        if (error) throw new Error(`sign in as ${email}: ${error.message}`);
        return client;
      })(),
    );
  }
  return cache.get(email)!;
}

export function anon(): Client {
  return createClient<Database>(url(), anonKey(), { auth: { persistSession: false } });
}

export function service(): Client {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient<Database>(url(), key, { auth: { persistSession: false } });
}

/** Ids visible to a client for a table. */
export async function visibleIds(client: Client, table: string, column = "id"): Promise<string[]> {
  const { data, error } = await client.from(table as "profiles").select(column as "id");
  if (error) throw error;
  return (data ?? []).map((r) => (r as Record<string, string>)[column]);
}

export const PIPELINE = "60000000-0000-4000-8000-000000000001";
export const SPRINT = "60000000-0000-4000-8000-000000000003";
export const BRAND_ESPACES = "40000000-0000-4000-8000-000000000001";

type Stage = Database["public"]["Enums"]["card_stage"];

/** Insert a pipeline card directly (service role) for a test. */
export async function makePipelineCard(stage: Stage, overrides: Record<string, unknown> = {}) {
  const svc = service();
  const { data: list } = await svc.from("lists").select("id").eq("board_id", PIPELINE).eq("stage", stage).single();
  const { data, error } = await svc
    .from("cards")
    .insert({
      board_id: PIPELINE,
      list_id: list!.id,
      position: "a0" + String(Math.floor(Math.random() * 9e5) + 1e5).replace(/0/g, "5"),
      title: `Test card ${Date.now()}`,
      objective: "Leads",
      vertical: "Offices",
      brand_id: BRAND_ESPACES,
      format: "static",
      platforms: ["instagram"],
      due_at: new Date(Date.now() + 86400000 * 5).toISOString(),
      stage,
      request_kind: "strategic",
      requesting_department_id: DEPT.sales,
      requester_id: U.sales,
      reviewer_id: U.leadCreative,
      approver_id: U.approver,
      created_by: U.traffic,
      ...overrides,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data!;
}

export async function assign(cardId: string, userId: string, role: Database["public"]["Enums"]["assignee_role"] = "design") {
  const { error } = await service().from("card_assignees").insert({ card_id: cardId, user_id: userId, role });
  if (error) throw error;
}

export async function cardStage(cardId: string) {
  const { data } = await service().from("cards").select("stage, revision_count, delivered_at, list_id").eq("id", cardId).single();
  return data!;
}

export async function activeStep(cardId: string) {
  const { data } = await service()
    .from("approval_steps")
    .select("id, approver_id, card_stage, status")
    .eq("subject_type", "card")
    .eq("subject_id", cardId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}
