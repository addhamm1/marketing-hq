import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Daily: cards published 7 or more days ago move to reported. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const { data, error } = await createAdminClient().rpc("cron_daily");
  if (error) return Response.json({ error: "failed" }, { status: 500 });
  return Response.json({ reported: data });
}
