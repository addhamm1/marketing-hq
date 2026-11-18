import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { flushPushQueue } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/** Every five minutes: new notifications go out to phones. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  return Response.json(await flushPushQueue());
}
