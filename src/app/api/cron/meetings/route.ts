import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Every 5 minutes: fixed meeting occurrences, 15-minute reminders and the "In a meeting" status. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const { data, error } = await createAdminClient().rpc("cron_meetings", {});
  if (error) return Response.json({ error: "failed" }, { status: 500 });
  return Response.json({ reminded: data });
}
