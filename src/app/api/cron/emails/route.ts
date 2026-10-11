import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { flushEmailQueue } from "@/lib/email/queue";

export const dynamic = "force-dynamic";

/** Safety net for emails that were not sent right after the action. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  return Response.json({ sent: await flushEmailQueue() });
}
