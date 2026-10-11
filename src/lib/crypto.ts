import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time comparison for secrets and tokens. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // keep timing similar
    return false;
  }
  return timingSafeEqual(ab, bb);
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32 without padding. */
export function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** Check-in QR token for a branch and 60-second window (PRODUCT_SPEC.md section 5). */
export function qrToken(secret: string, branchId: string, window: number): string {
  const mac = createHmac("sha256", secret).update(`${branchId}:${window}`).digest();
  return base32(mac).slice(0, 10);
}

export function qrWindow(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / 60);
}

/** Accept the current and the previous window only. */
export function verifyQrToken(secret: string, branchId: string, token: string, nowMs = Date.now()): boolean {
  const w = qrWindow(nowMs);
  const current = safeEqual(qrToken(secret, branchId, w), token);
  const previous = safeEqual(qrToken(secret, branchId, w - 1), token);
  return current || previous;
}

export function randomKey(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Temporary password: 14 characters without look-alikes (0/O, 1/l/I). */
export function temporaryPassword(length = 14): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}
