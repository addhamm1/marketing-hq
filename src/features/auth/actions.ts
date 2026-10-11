"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { fail, invalid, ok, safeNext, type ActionResult } from "@/lib/actions";
import { decideRoute, homePath, type Access } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { accountSchema, changePasswordSchema, signInSchema } from "./schemas";

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Same message whether or not the account exists.
    return fail(error.status === 429 ? "auth.tooManyAttempts" : "auth.invalidCredentials");
  }

  // Work out the destination here: a server-action redirect that the proxy
  // redirects again leaves a stale URL in the browser.
  const { data } = await supabase.rpc("my_access");
  const access = data as Access | null;
  const locale = await getLocale();
  if (!access || access.status !== "active") {
    await supabase.auth.signOut({ scope: "local" });
    return redirect({ href: "/sign-in?reason=inactive", locale });
  }
  if (access.must_change_password) return redirect({ href: "/change-password", locale });
  const next = safeNext(parsed.data.next);
  const target = next && decideRoute(next, true, access).kind === "allow" ? next : homePath(access);
  return redirect({ href: target, locale });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const locale = await getLocale();
  return redirect({ href: "/sign-in", locale });
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const wasForced = access.must_change_password;

  // Check the current password with a cookie-less client so the user's own
  // session is untouched, then drop the extra session it created.
  const probe = createPlainClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: probeError } = await probe.auth.signInWithPassword({
    email: access.email,
    password: parsed.data.currentPassword,
  });
  if (probeError) {
    const key = probeError.status === 429 ? "auth.tooManyAttempts" : "auth.wrongCurrentPassword";
    return fail(key, { currentPassword: key });
  }
  await probe.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    if (error.code === "same_password") {
      return fail("validation.passwordSame", { newPassword: "validation.passwordSame" });
    }
    if (error.code === "weak_password") {
      return fail("auth.weakPassword", { newPassword: "auth.weakPassword" });
    }
    return fail("common.unknownError");
  }

  // must_change_password is not writable by users; the server clears it.
  const admin = createAdminClient();
  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", access.user_id);
  if (flagError) return fail("common.unknownError");

  await supabase.auth.signOut({ scope: "others" });

  if (wasForced) {
    const locale = await getLocale();
    // First sign-in: create a character first (D5-02), otherwise go home.
    const target = !access.avatar_seen && access.is_team_app ? "/me/character" : homePath(access);
    return redirect({ href: target, locale });
  }
  return ok();
}

export async function updateAccount(input: unknown): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name || null,
      phone: parsed.data.phone || null,
      locale: parsed.data.locale,
    })
    .eq("id", access.user_id);
  if (error) return fail("common.unknownError");
  revalidatePath("/", "layout");
  return ok();
}

/** Language switcher: saves the choice on the profile when signed in. */
export async function saveLocale(locale: "en" | "ar"): Promise<void> {
  if (locale !== "en" && locale !== "ar") return;
  const access = await actionAccess();
  if (!access) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ locale }).eq("id", access.user_id);
}
