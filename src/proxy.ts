import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { decideRoute, type Access } from "@/lib/auth/access";
import { env } from "@/lib/env";
import { routing } from "@/i18n/routing";

const handleI18n = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Locale: redirects bare paths to /<locale>/..., otherwise passes through.
  const response = handleI18n(request);
  if (response.headers.get("location")) return response;

  // 2. Supabase session refresh, writing refreshed cookies onto the response.
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: claims } = await supabase.auth.getClaims();
  const signedIn = !!claims?.claims?.sub;

  // 3. Coarse route guard.
  const [, locale, ...rest] = request.nextUrl.pathname.split("/");
  const path = "/" + rest.join("/");
  let access: Access | null = null;
  if (signedIn) {
    const { data } = await supabase.rpc("my_access");
    access = (data as Access | null) ?? null;
  }
  const decision = decideRoute(path === "/" ? "/" : path.replace(/\/$/, ""), signedIn, access);
  if (decision.kind === "allow") return response;

  if (decision.kind === "sign-out") await supabase.auth.signOut();
  const target = new URL(`/${locale}${decision.to}`, request.url);
  const redirect = NextResponse.redirect(target);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  // Skip API routes (cron checks its own secret; export checks the session), Next internals and files.
  matcher: ["/((?!api|_next|_vercel|monitoring|.*\\..*).*)"],
};
