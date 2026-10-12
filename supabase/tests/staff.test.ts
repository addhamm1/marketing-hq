import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import staff from "../staff.json";
import type { Database } from "@/lib/supabase/database.types";
import { PASSWORD, service, type Client } from "./helpers";

// User cases for the real Espaces staff (supabase/seed/08_espaces_people.sql, DECISIONS D-20):
// super admins Adham and Omnia, Roaa with traffic access, everyone else a regular employee.
const svc = service();
const cache = new Map<string, Promise<Client>>();
function signIn(email: string): Promise<Client> {
  if (!cache.has(email)) {
    cache.set(
      email,
      (async () => {
        const c = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
        if (error) throw new Error(`sign in as ${email}: ${error.message}`);
        return c;
      })(),
    );
  }
  return cache.get(email)!;
}
const P = {
  adham: "adham@e-spaces.co",
  omnia: "omnia@e-spaces.co",
  roaa: "roaa@e-spaces.co",
  ibrahem: "ibrahem@e-spaces.co",
  mahmoud: "mahmoud.hussein@e-spaces.co",
  hatem: "hatem@e-spaces.co",
  basil: "basil@e-spaces.co",
  asmaa: "asmaa@e-spaces.co",
  hadeer: "hadeer@e-spaces.co",
  ceo: "ahmed.yassin@e-spaces.co",
};
async function idOf(email: string) {
  const { data } = await svc.from("profiles").select("id").eq("email", email).single();
  return data!.id;
}
/** A random working day (not Friday) so reruns don't collide with earlier leave. */
function workday(month: string) {
  for (;;) {
    const d = `${month}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`;
    if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 5) return d;
  }
}
type Access = { roles: { role: string }[]; is_team_app: boolean; is_portal: boolean; is_marketing: boolean; team_slug: string | null };
async function access(email: string) {
  const { data } = await (await signIn(email)).rpc("my_access");
  return data as unknown as Access;
}

describe("staff roster and access tiers", () => {
  it("every person in staff.json can sign in with the roles from the roster", async () => {
    for (const p of staff.people) {
      const a = await access(p.email);
      expect(a.roles.map((r) => r.role).sort(), p.email).toEqual([...p.roles].sort());
    }
  });

  it("only Adham and Omnia are super admins", async () => {
    const { data } = await svc.from("user_roles").select("profiles!inner(email)").eq("role", "super_admin");
    const emails = (data ?? []).map((r) => (r.profiles as unknown as { email: string }).email).filter((e) => e.endsWith("@e-spaces.co"));
    expect(emails.sort()).toEqual([P.adham, P.omnia].sort());
  });

  it("the marketing team uses the team app; other departments land on the portal", async () => {
    for (const e of [P.adham, P.omnia, P.roaa, P.ibrahem, P.mahmoud, P.hatem, P.basil]) {
      expect((await access(e)).is_team_app, e).toBe(true);
    }
    for (const e of [P.asmaa, P.hadeer, P.ceo]) {
      const a = await access(e);
      expect(a.is_team_app, e).toBe(false);
      expect(a.is_portal, e).toBe(true);
    }
    expect((await access(P.roaa)).team_slug).toBe("traffic");
    expect((await access(P.mahmoud)).team_slug).toBe("creative");
  });
});

describe("what each tier can do", () => {
  it("super admins edit profiles; Roaa and employees cannot", async () => {
    const basil = await idOf(P.basil);
    for (const e of [P.adham, P.omnia]) {
      const { error } = await (await signIn(e)).rpc("admin_update_profile", { p_user_id: basil, patch: { title: "Intern Content Creator" } });
      expect(error, e).toBeNull();
    }
    for (const e of [P.roaa, P.ibrahem, P.mahmoud, P.asmaa]) {
      const { error } = await (await signIn(e)).rpc("admin_update_profile", { p_user_id: basil, patch: { title: "Hacked" } });
      expect(error?.code, e).toBe("42501");
    }
  });

  it("super admins read the audit log; nobody else does", async () => {
    for (const e of [P.adham, P.omnia]) {
      const { data } = await (await signIn(e)).from("audit_log").select("id").limit(1);
      expect(data?.length, e).toBe(1);
    }
    for (const e of [P.roaa, P.mahmoud, P.asmaa]) {
      const { data } = await (await signIn(e)).from("audit_log").select("id").limit(1);
      expect(data ?? [], e).toEqual([]);
    }
  });

  it("Roaa (traffic) adds work to the pipeline; creative employees cannot", async () => {
    const ok = await (await signIn(P.roaa)).rpc("create_internal_card", { p_title: `Roaa intake ${Date.now()}`, p_position: "zz" + Date.now() });
    expect(ok.error).toBeNull();
    const denied = await (await signIn(P.mahmoud)).rpc("create_internal_card", { p_title: "Not allowed", p_position: "zy" });
    expect(denied.error?.code).toBe("42501");
  });

  it("employees see the boards; other departments do not", async () => {
    const { data: mine } = await (await signIn(P.hatem)).from("boards").select("id");
    expect(mine!.length).toBeGreaterThan(0);
    const { data: theirs } = await (await signIn(P.hadeer)).from("boards").select("id");
    expect(theirs).toEqual([]);
  });

  it("leave with no team lead goes to the super admins; Roaa never approves leave", async () => {
    // The traffic team has no team lead, so Roaa's own leave falls back to the super admins.
    const { data: requestId, error } = await (await signIn(P.roaa)).rpc("submit_request", {
      type_key: "annual_leave",
      data: (() => { const d = workday("2027-12"); return { starts_on: d, ends_on: d }; })(),
    });
    expect(error).toBeNull();
    const { data: steps } = await svc.from("approval_steps").select("approver_id, status").eq("subject_id", requestId!).eq("status", "active");
    const approvers = steps!.map((s) => s.approver_id);
    expect(approvers).toEqual(expect.arrayContaining([await idOf(P.adham), await idOf(P.omnia)]));
    const { data: hatemLeave } = await (await signIn(P.hatem)).rpc("submit_request", {
      type_key: "annual_leave",
      data: (() => { const d = workday("2027-10"); return { starts_on: d, ends_on: d }; })(),
    });
    const { data: hatemSteps } = await svc.from("approval_steps").select("approver_id").eq("subject_id", hatemLeave!);
    expect(hatemSteps!.map((s) => s.approver_id)).not.toContain(await idOf(P.roaa));
    // Omnia approves from her inbox.
    const omniaStep = await svc.from("approval_steps").select("id").eq("subject_id", requestId!).eq("approver_id", await idOf(P.omnia)).eq("status", "active").single();
    const { error: decideError } = await (await signIn(P.omnia)).rpc("decide_step", { p_step_id: omniaStep.data!.id, p_decision: "approved" });
    expect(decideError).toBeNull();
  });

  it("a requester submits an urgent request from the portal and cannot approve leave", async () => {
    const asmaa = await signIn(P.asmaa);
    const { error } = await asmaa.rpc("submit_urgent_request", {
      payload: {
        title: `Asmaa urgent ${Date.now()}`,
        objective: "Virtual office leads",
        vertical: "Virtual Offices",
        brand_id: "40000000-0000-4000-8000-000000000001",
        format: "static",
        platforms: ["instagram"],
        due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
        urgent_reason: "Campaign launch moved up",
      },
    });
    expect(error).toBeNull();
    const { data: inbox } = await asmaa.from("approval_steps").select("id").eq("subject_type", "request").eq("status", "active");
    expect(inbox ?? []).toEqual([]);
  });
});
