import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Hourly (UTC). The SQL works out Cairo time, so summer time needs no schedule change. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const { data, error } = await createAdminClient().rpc("cron_auto_checkout", {});
  if (error) return Response.json({ error: "failed" }, { status: 500 });
  return Response.json({ closed: data });
}
