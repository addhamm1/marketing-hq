import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Every 5 minutes: 30-minute reminders and the 2-hour "not marked as published" alert. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const { data, error } = await createAdminClient().rpc("cron_post_reminders", {});
  if (error) return Response.json({ error: "failed" }, { status: 500 });
  return Response.json({ notified: data });
}
