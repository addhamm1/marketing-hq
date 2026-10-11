import "server-only";
import { qrToken, qrWindow, safeEqual, sha256Hex } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a kiosk key against the stored hash; returns the branch when valid. */
export async function verifyKiosk(branchId: string, key: string | null) {
  if (!key || !UUID.test(branchId) || key.length > 200) return null;
  const admin = createAdminClient();
  const [{ data: secret }, { data: branch }] = await Promise.all([
    admin.from("branch_secrets").select("kiosk_key_hash, hmac_secret").eq("branch_id", branchId).maybeSingle(),
    admin.from("branches").select("id, name_en, name_ar, is_active").eq("id", branchId).maybeSingle(),
  ]);
  if (!secret?.kiosk_key_hash || !branch?.is_active) return null;
  if (!safeEqual(sha256Hex(key), secret.kiosk_key_hash)) return null;
  return { branch, hmacSecret: secret.hmac_secret };
}

export function currentToken(hmacSecret: string, branchId: string, now = Date.now()) {
  const window = qrWindow(now);
  return { token: qrToken(hmacSecret, branchId, window), expiresAt: (window + 1) * 60_000 };
}
