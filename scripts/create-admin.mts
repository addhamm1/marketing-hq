// Bootstrap the first super_admin on a fresh project (sign-up is disabled).
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/create-admin.mts you@e-spaces.co "Full Name"
// Prints a one-time temporary password; the person must change it at first sign-in.
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, fullName] = process.argv.slice(2);
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !fullName || !url || !key) {
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/create-admin.mts <email> "<full name>"');
  process.exit(1);
}

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const password = Array.from({ length: 14 }, () => alphabet[randomInt(alphabet.length)]).join("");
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
if (error || !data.user) {
  console.error("Could not create the user:", error?.message);
  process.exit(1);
}
const id = data.user.id;
const { data: dept } = await admin.from("departments").select("id").eq("slug", "marketing").single();
const { data: hq } = await admin.from("branches").select("id").eq("slug", "hq").maybeSingle();
await admin.from("profiles").update({ department_id: dept?.id ?? null, home_branch_id: hq?.id ?? null, must_change_password: true }).eq("id", id);
const { error: roleError } = await admin.from("user_roles").insert({ user_id: id, role: "super_admin" });
if (roleError) {
  console.error("User created but the role failed:", roleError.message);
  process.exit(1);
}
console.log(`Created super_admin ${email}`);
console.log(`Temporary password (shown once): ${password}`);
