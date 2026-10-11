import { generateKeyBetween } from "fractional-indexing";

function valid(key: string | null | undefined): string | null {
  if (!key) return null;
  try {
    generateKeyBetween(key, null);
    return key;
  } catch {
    return null;
  }
}

/** Fractional-index key between two neighbours; tolerates bad legacy keys. */
export function keyBetween(before: string | null | undefined, after: string | null | undefined): string {
  const a = valid(before);
  const b = valid(after);
  try {
    return generateKeyBetween(a, b && a && b <= a ? null : b);
  } catch {
    return generateKeyBetween(a, null);
  }
}

/** Sort by fractional position using byte order (matches COLLATE "C"). */
export function byPosition<T extends { position: string }>(a: T, b: T) {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}
