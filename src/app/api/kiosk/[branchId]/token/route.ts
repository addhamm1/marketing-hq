import { currentToken, verifyKiosk } from "@/features/checkin/kiosk";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Current check-in QR for a branch. Needs the kiosk key, not a sign-in. */
export async function GET(request: Request, ctx: RouteContext<"/api/kiosk/[branchId]/token">) {
  const { branchId } = await ctx.params;
  const url = new URL(request.url);
  const kiosk = await verifyKiosk(branchId, url.searchParams.get("key"));
  if (!kiosk) return Response.json({ error: "invalid" }, { status: 401, headers: { "cache-control": "no-store" } });
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const { token, expiresAt } = currentToken(kiosk.hmacSecret, branchId);
  return Response.json(
    { url: `${env.appUrl}/${locale}/checkin?b=${branchId}&t=${token}`, expiresAt },
    { headers: { "cache-control": "no-store" } },
  );
}
