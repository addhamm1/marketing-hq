"use server";

import { revalidatePath } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { temporaryPassword } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createAccountSchema, rolesPayload, setActiveSchema, updateUserSchema, userIdSchema,
} from "./schemas";

const BANNED_FOREVER = "876000h";

async function superAdmin() {
  const access = await actionAccess();
  return access && hasRole(access, "super_admin") ? access : null;
}

function rpcError(error: { message?: string; code?: string } | null) {
  if (error?.message?.includes("own super_admin")) return "admin.selfLockout";
  if (error?.message?.includes("deactivate yourself")) return "admin.selfLockout";
  if (error?.code === "42501") return "common.notAllowed";
  return "common.unknownError";
}

/** Create an account with a one-time temporary password (D1-07). */
export async function createAccount(input: unknown): Promise<ActionResult<{ password: string; userId: string }>> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const v = parsed.data;

  const admin = createAdminClient();
  const password = temporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: v.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: v.full_name },
  });
  if (createError || !created.user) {
    const taken = createError?.code === "email_exists" || createError?.status === 422;
    return taken ? fail("admin.emailTaken", { email: "admin.emailTaken" }) : fail("common.unknownError");
  }
  const userId = created.user.id;

  // Profile and roles go through the audited admin functions as the caller.
  const supabase = await createClient();
  const { error: profileError } = await supabase.rpc("admin_update_profile", {
    p_user_id: userId,
    patch: {
      full_name: v.full_name,
      department_id: v.department_id,
      team_id: v.team_id,
      home_branch_id: v.home_branch_id,
      title: v.title || null,
      phone: v.phone,
      birth_month: v.birth_month,
      birth_day: v.birth_day,
      joined_on: v.joined_on,
      must_change_password: true,
      workdays: v.workdays,
      start_time: v.start_time,
      end_time: v.end_time,
    },
  });
  const { error: rolesError } = profileError
    ? { error: profileError }
    : await supabase.rpc("admin_set_roles", { p_user_id: userId, roles: rolesPayload(v.roles, v.lead_team_id) });

  if (profileError || rolesError) {
    await admin.auth.admin.deleteUser(userId);
    return fail(rpcError(profileError ?? rolesError));
  }

  revalidatePath("/[locale]/admin/users", "page");
  return ok({ password, userId });
}

export async function updateUser(input: unknown): Promise<ActionResult> {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !hasRole(access, "super_admin", "hr")) return fail("common.notAllowed");
  const v = parsed.data;
  const isAdmin = hasRole(access, "super_admin");
  const supabase = await createClient();

  // hr may change schedules and people details (birthday, joining date) only.
  const hrFields = {
    workdays: v.workdays, start_time: v.start_time, end_time: v.end_time,
    birth_month: v.birth_month, birth_day: v.birth_day, joined_on: v.joined_on,
  };
  const patch = isAdmin
    ? {
        full_name: v.full_name,
        department_id: v.department_id,
        team_id: v.team_id,
        home_branch_id: v.home_branch_id,
        title: v.title || null,
        phone: v.phone,
        ...hrFields,
      }
    : hrFields;

  const { error } = await supabase.rpc("admin_update_profile", { p_user_id: v.user_id, patch });
  if (error) return fail(rpcError(error));

  if (isAdmin) {
    const { error: rolesError } = await supabase.rpc("admin_set_roles", {
      p_user_id: v.user_id,
      roles: rolesPayload(v.roles, v.lead_team_id),
    });
    if (rolesError) return fail(rpcError(rolesError));
  }
  revalidatePath("/[locale]/admin/users", "page");
  return ok();
}

/** New temporary password, forced change at next sign-in, signed out everywhere. */
export async function resetPassword(input: unknown): Promise<ActionResult<{ password: string }>> {
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");

  const supabase = await createClient();
  const { error: flagError } = await supabase.rpc("require_password_change", { p_user_id: parsed.data.user_id });
  if (flagError) return fail(rpcError(flagError));

  const admin = createAdminClient();
  const password = temporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, { password });
  if (error) return fail("common.unknownError");
  await admin.rpc("admin_revoke_sessions", { p_user_id: parsed.data.user_id });

  revalidatePath("/[locale]/admin/users", "page");
  return ok({ password });
}

/** Deactivate (ban and sign out everywhere) or reactivate an account. */
export async function setActive(input: unknown): Promise<ActionResult> {
  const parsed = setActiveSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const { user_id, active } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_profile", {
    p_user_id: user_id,
    patch: { status: active ? "active" : "inactive" },
  });
  if (error) return fail(rpcError(error));

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(user_id, {
    ban_duration: active ? "none" : BANNED_FOREVER,
  });
  if (banError) return fail("common.unknownError");
  if (!active) await admin.rpc("admin_revoke_sessions", { p_user_id: user_id });

  revalidatePath("/[locale]/admin/users", "page");
  return ok();
}
