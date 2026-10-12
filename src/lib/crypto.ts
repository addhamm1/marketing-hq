import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";

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

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Temporary password: 14 characters without look-alikes (0/O, 1/l/I). */
export function temporaryPassword(length = 14): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}
