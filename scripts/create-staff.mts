// Create accounts for the people in supabase/staff.json on staging or production (sign-up is disabled).
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/create-staff.mts [email ...]
// Existing accounts are skipped. Each new person gets a one-time temporary password, printed once
// for the admin to hand over privately; they must change it at first sign-in. Nothing is stored or emailed.
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Person = { email: string; full_name: string; department: string; team: string | null; roles: string[] };
type Roster = { people: Person[]; default_approvers: Record<string, string> };

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/create-staff.mts [email ...]");
  process.exit(1);
}
const only = new Set(process.argv.slice(2).map((e) => e.toLowerCase()));
const roster = JSON.parse(readFileSync("supabase/staff.json", "utf8")) as Roster;
const admin = createClient(url, key, { auth: { persistSession: false } });

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const tempPassword = () => Array.from({ length: 14 }, () => alphabet[randomInt(alphabet.length)]).join("");

const [{ data: departments }, { data: teams }, { data: hq }] = await Promise.all([
  admin.from("departments").select("id, slug"),
  admin.from("teams").select("id, slug"),
  admin.from("branches").select("id").eq("slug", "hq").maybeSingle(),
]);
const deptId = (slug: string) => departments?.find((d) => d.slug === slug)?.id ?? null;
const teamId = (slug: string | null) => (slug ? (teams?.find((t) => t.slug === slug)?.id ?? null) : null);

const created: { email: string; password: string }[] = [];
for (const p of roster.people) {
  if (only.size && !only.has(p.email.toLowerCase())) continue;
  const { data: existing } = await admin.from("profiles").select("id").eq("email", p.email).maybeSingle();
  if (existing) {
    console.log(`skip   ${p.email} (already exists)`);
    continue;
  }
  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: p.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: p.full_name },
  });
  if (error || !data.user) {
    console.error(`error  ${p.email}: ${error?.message}`);
    continue;
  }
  const id = data.user.id;
  const marketingOrAdmin = p.department === "marketing" || p.roles.includes("super_admin");
  await admin
    .from("profiles")
    .update({
      department_id: deptId(p.department),
      team_id: teamId(p.team),
      home_branch_id: marketingOrAdmin ? (hq?.id ?? null) : null,
      display_name: p.full_name.split(" ")[0],
      must_change_password: true,
    })
    .eq("id", id);
  const { error: roleError } = await admin
    .from("user_roles")
    .insert(p.roles.map((role) => ({ user_id: id, role: role as "member", team_id: role === "team_lead" ? teamId(p.team) : null })));
  if (roleError) console.error(`error  ${p.email}: roles not saved (${roleError.message})`);
  created.push({ email: p.email, password });
  console.log(`create ${p.email} (${p.roles.join(", ")})`);
}

for (const [slug, email] of Object.entries(roster.default_approvers)) {
  const { data: person } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (person) await admin.from("departments").update({ default_approver_id: person.id }).eq("slug", slug);
}

if (created.length) {
  console.log("\nTemporary passwords (shown once; hand each over privately):");
  for (const c of created) console.log(`  ${c.email.padEnd(32)} ${c.password}`);
}
