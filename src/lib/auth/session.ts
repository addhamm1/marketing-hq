import "server-only";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRole, type Access, type AppRole } from "./access";

/** The signed-in user's access context, once per request. */
export const getAccess = cache(async (): Promise<Access | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return null;
  const { data } = await supabase.rpc("my_access");
  return (data as Access | null) ?? null;
});

export async function requireAccess(): Promise<Access> {
  const access = await getAccess();
  if (!access || access.status !== "active") {
    const locale = await getLocale();
    return redirect({ href: "/sign-in", locale });
  }
  return access;
}

/** For pages: redirect home when the caller lacks every one of `roles`. */
export async function requireRole(...roles: AppRole[]): Promise<Access> {
  const access = await requireAccess();
  if (!hasRole(access, ...roles)) {
    const locale = await getLocale();
    return redirect({ href: "/", locale });
  }
  return access;
}

/** For server actions: the caller's access, or null when signed out or inactive. */
export async function actionAccess(): Promise<Access | null> {
  const access = await getAccess();
  return access && access.status === "active" ? access : null;
}
