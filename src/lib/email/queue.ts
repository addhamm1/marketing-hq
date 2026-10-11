import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_KINDS, renderEmail, type EmailKind } from "./templates";

/**
 * Sends pending notification emails (approval waiting, request decided, card
 * returned). Rows are claimed atomically, so concurrent runs never double-send.
 * Without RESEND_API_KEY the email is logged as a preview instead (local dev).
 */
export async function flushEmailQueue(limit = 50): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: pending } = await admin
    .from("notifications")
    .select("id")
    .is("emailed_at", null)
    .in("kind", EMAIL_KINDS)
    .gte("created_at", since)
    .order("created_at")
    .limit(limit);
  if (!pending?.length) return 0;

  const { data: claimed } = await admin
    .from("notifications")
    .update({ emailed_at: new Date().toISOString() })
    .in("id", pending.map((p) => p.id))
    .is("emailed_at", null)
    .select("id, kind, link, data, user_id, profiles!notifications_user_id_fkey(email, full_name, display_name, locale, status)");
  if (!claimed?.length) return 0;

  const key = process.env.RESEND_API_KEY;
  const resend = key ? new Resend(key) : null;
  const from = process.env.EMAIL_FROM ?? "Pixel HQ <pixelhq@e-spaces.co>";
  let sent = 0;

  for (const n of claimed) {
    const profile = n.profiles as unknown as { email: string; full_name: string; display_name: string | null; locale: string; status: string } | null;
    if (!profile?.email || profile.status !== "active") continue;
    const email = renderEmail({
      kind: n.kind as EmailKind,
      locale: profile.locale === "ar" ? "ar" : "en",
      name: profile.display_name || profile.full_name || "",
      link: n.link ?? "/",
      data: (n.data ?? {}) as Record<string, unknown>,
      appUrl: env.appUrl,
    });
    if (!resend) {
      console.info(`[email preview] kind=${n.kind} subject="${email.subject}"`);
      sent++;
      continue;
    }
    const { error } = await resend.emails.send({ from, to: profile.email, subject: email.subject, html: email.html, text: email.text });
    if (error) {
      // Release the claim so the next run retries.
      await admin.from("notifications").update({ emailed_at: null }).eq("id", n.id);
      continue;
    }
    sent++;
  }
  return sent;
}
