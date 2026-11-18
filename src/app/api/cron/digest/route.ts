import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { runDailyDigest } from "@/lib/email/digest";

export const dynamic = "force-dynamic";

/** Hourly through the morning (UTC); sends only at the Cairo hour set in `digest_hour`. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  try {
    return Response.json(await runDailyDigest());
  } catch {
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
