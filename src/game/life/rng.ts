/** Small seeded random helpers so every character behaves the same way for the same seed. */

export type Rng = () => number;

/** FNV-1a hash of a string, as an unsigned 32-bit seed. */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: tiny, fast, good enough for game behaviour. Returns numbers in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  return items.length ? items[Math.floor(rng() * items.length)] : undefined;
}

/** Weighted choice among the keys with a positive weight that `allow` accepts; null when none is left. */
export function weighted<K extends string>(
  rng: Rng,
  weights: Partial<Record<K, number>>,
  allow: (key: K) => boolean = () => true,
): K | null {
  const entries = (Object.entries(weights) as [K, number][]).filter(([k, w]) => w > 0 && allow(k));
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const [k, w] of entries) {
    roll -= w;
    if (roll < 0) return k;
  }
  return entries[entries.length - 1]?.[0] ?? null;
}
