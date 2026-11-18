import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushEndpoint } from "./endpoint";
import { renderPush, type PushSource } from "./render";

/** Older notifications are stale news: they stay unsent rather than arrive late. */
const RECENT_MS = 60 * 60_000;
/** How long a push service keeps trying to reach a phone that is off. */
const TTL_SECONDS = 6 * 3600;
const BATCH = 10;

export type StoredSubscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
export type SendOutcome = "sent" | "gone" | "failed";
export type PushSender = (subscription: StoredSubscription, payload: string) => Promise<SendOutcome>;
export type PushRun = { configured: boolean; claimed: number; sent: number; failed: number; removed: number };

/** The web-push sender, or null when the keys are missing or unusable. */
export function webPushSender(): PushSender | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  try {
    setVapidDetails(subject, publicKey, privateKey);
  } catch {
    console.error("[push] VAPID settings are invalid");
    return null;
  }
  return async (s, payload) => {
    try {
      await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        TTL: TTL_SECONDS,
        timeout: 8000,
      });
      return "sent";
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      return status === 404 || status === 410 ? "gone" : "failed";
    }
  };
}

/**
 * Sends recent notifications to phones. Rows are claimed atomically, so concurrent
 * runs never double-send, and a claim is never released: each notification gets one
 * attempt. Subscriptions the push service says are gone are deleted.
 */
export async function flushPushQueue(sender: PushSender | null = webPushSender(), limit = 200): Promise<PushRun> {
  const run: PushRun = { configured: !!sender, claimed: 0, sent: 0, failed: 0, removed: 0 };
  if (!sender) return run;

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("notifications")
    .select("id")
    .is("pushed_at", null)
    .gte("created_at", new Date(Date.now() - RECENT_MS).toISOString())
    .order("created_at")
    .limit(limit);
  if (!pending?.length) return run;

  const { data: claimed } = await admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .in("id", pending.map((p) => p.id))
    .is("pushed_at", null)
    .select("id, kind, link, data, user_id, profiles!notifications_user_id_fkey(locale, status)");
  if (!claimed?.length) return run;
  run.claimed = claimed.length;

  const userIds = [...new Set(claimed.map((n) => n.user_id))];
  const actorIds = [
    ...new Set(claimed.map((n) => (n.data as { by?: unknown } | null)?.by).filter((by): by is string => typeof by === "string")),
  ];
  const [{ data: subscriptions }, { data: muted }, { data: actors }] = await Promise.all([
    admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
    admin.from("notification_preferences").select("user_id").in("user_id", userIds).eq("push_enabled", false),
    actorIds.length
      ? admin.from("profiles").select("id, full_name, display_name").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; display_name: string | null }[] }),
  ]);

  const mutedUsers = new Set((muted ?? []).map((m) => m.user_id));
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.display_name || a.full_name]));
  const gone = new Set<string>();
  const used = new Set<string>();
  const byUser = new Map<string, StoredSubscription[]>();
  for (const s of subscriptions ?? []) {
    if (!isPushEndpoint(s.endpoint)) {
      gone.add(s.id);
      continue;
    }
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  }

  const jobs: { subscription: StoredSubscription; payload: string }[] = [];
  for (const n of claimed) {
    const profile = n.profiles as unknown as { locale: string; status: string } | null;
    if (profile?.status !== "active" || mutedUsers.has(n.user_id)) continue;
    const by = (n.data as { by?: unknown } | null)?.by;
    const message = renderPush(
      n as unknown as PushSource,
      profile.locale === "ar" ? "ar" : "en",
      typeof by === "string" ? (actorName.get(by) ?? null) : null,
    );
    for (const subscription of byUser.get(n.user_id) ?? []) {
      jobs.push({ subscription, payload: JSON.stringify(message) });
    }
  }

  for (let i = 0; i < jobs.length; i += BATCH) {
    await Promise.all(
      jobs.slice(i, i + BATCH).map(async ({ subscription, payload }) => {
        if (gone.has(subscription.id)) return;
        const outcome = await sender(subscription, payload);
        if (outcome === "sent") {
          run.sent++;
          used.add(subscription.id);
        } else if (outcome === "gone") {
          gone.add(subscription.id);
        } else {
          run.failed++;
        }
      }),
    );
  }

  if (gone.size) {
    await admin.from("push_subscriptions").delete().in("id", [...gone]);
    run.removed = gone.size;
  }
  const stillUsed = [...used].filter((id) => !gone.has(id));
  if (stillUsed.length) {
    await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", stillUsed);
  }
  return run;
}
