import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { flushEmailQueue } from "@/lib/email/queue";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Hourly: cards due within 24 hours notify their assignees once per due date. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const { data, error } = await createAdminClient().rpc("cron_due_soon");
  if (error) return Response.json({ error: "failed" }, { status: 500 });
  await flushEmailQueue();
  return Response.json({ notified: data });
}
