import "server-only";
import { safeEqual } from "@/lib/crypto";

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
