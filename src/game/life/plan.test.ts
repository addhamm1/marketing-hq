import { describe, expect, it } from "vitest";
import { ACTIVITY_WEIGHTS, activityDuration, animFor, bubbleFor, chooseActivity } from "./plan";
import { hashSeed, mulberry32, weighted } from "./rng";

describe("rng", () => {
  it("is repeatable per seed and in [0, 1)", () => {
    const a = mulberry32(hashSeed("user-1"));
    const b = mulberry32(hashSeed("user-1"));
    const c = mulberry32(hashSeed("user-2"));
    const xs = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(xs);
    expect(Array.from({ length: 50 }, () => c())).not.toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("weighted picks only allowed keys, roughly by weight", () => {
    const rng = mulberry32(1);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 4000; i++) {
      const k = weighted(rng, { a: 3, b: 1, c: 5 }, (key) => key !== "c");
      if (k) counts[k]++;
    }
    expect(counts.c).toBe(0);
    expect(counts.a / counts.b).toBeGreaterThan(2.4);
    expect(counts.a / counts.b).toBeLessThan(3.6);
    expect(weighted(rng, { a: 1 }, () => false)).toBeNull();
  });
});

describe("activity choice", () => {
  it("lets status decide: focus works, away sleeps, meeting meets, shoot shoots", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      expect(chooseActivity("focus", rng, () => true)).toBe("work");
      expect(chooseActivity("away", rng, () => true)).toBe("sleep");
      expect(["meeting", "call"]).toContain(chooseActivity("meeting", rng, () => true));
      expect(chooseActivity("shoot", rng, () => true)).toBe("shoot");
    }
  });

  it("break never sends people to their desk while a break place exists", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 300; i++) expect(chooseActivity("break", rng, () => true)).not.toBe("work");
    expect(ACTIVITY_WEIGHTS.break.work ?? 0).toBe(0);
  });

  it("falls back when the map has no place for the activity", () => {
    const rng = mulberry32(5);
    expect(chooseActivity("shoot", rng, (k) => k !== "shoot")).toBe("work");
    expect(chooseActivity("meeting", rng, () => false)).toBe("work");
  });

  it("maps activities to animations and bubbles", () => {
    const rng = mulberry32(8);
    expect(animFor("work", false)).toBe("type");
    expect(animFor("work", true)).toBe("walk");
    expect(animFor("dance", false)).toBe("dance");
    expect(bubbleFor("sleep", rng)).toBe("zzz");
    expect(bubbleFor("dance", rng)).toBe("music");
    expect(bubbleFor("wander", rng)).toBeNull();
  });

  it("gives focused people longer work stretches", () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const focus = activityDuration("work", a, "focus");
    const available = activityDuration("work", b, "available");
    expect(Math.abs(focus - available * 2)).toBeLessThanOrEqual(1);
  });
});
