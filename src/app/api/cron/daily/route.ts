import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Daily: reported cards, gate reminders, shoot reminders, strategic deadline reminders, celebrations. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const admin = createAdminClient();
  const [cards, workflow] = await Promise.all([admin.rpc("cron_daily"), admin.rpc("cron_workflow_daily", {})]);
  if (cards.error || workflow.error) return Response.json({ error: "failed" }, { status: 500 });
  return Response.json({ reported: cards.data, workflow: workflow.data });
}
