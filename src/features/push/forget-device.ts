import { removePushSubscription } from "./actions";

const LIMIT_MS = 2_000;

async function forget() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const current = await registration?.pushManager.getSubscription();
  if (!current) return;
  await removePushSubscription({ endpoint: current.endpoint });
  await current.unsubscribe();
}

/**
 * Stops phone notifications on this device at sign-out, so the next person on a
 * shared phone never sees them. Never blocks signing out for more than two seconds.
 */
export async function forgetThisDevice() {
  await Promise.race([forget().catch(() => undefined), new Promise((done) => setTimeout(done, LIMIT_MS))]);
}
