import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { AgentPose } from "./agent";
import { CONTROL_RESUME_MS, resolveFloorTap } from "./control";
import { type AgentInput, Director } from "./director";
import { type NavGrid, type Rect, type Tile, isWalkable, parseNavGrid } from "./grid";
import { type Places, type Spot, buildPlaces, homeSpot } from "./places";

const json = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../public/maps/hq.json"), "utf8")) as {
  layers: { name: string; objects?: Rect[] }[];
};
const zones = json.layers.find((l) => l.name === "zones")?.objects ?? [];
const grid = parseNavGrid(json) as NavGrid;
const places: Places = buildPlaces(grid, zones);
const desks = zones.filter((z) => /^desk-\d+$/.test(z.name)).map((z) => homeSpot(grid, z) as Spot);

const open = places.open[Math.floor(places.open.length / 2)];
const other = places.open[0];
const person = (i = 0): AgentInput => ({ id: `user-${i}`, status: "available", home: desks[i] });
const tileOf = (p: AgentPose): Tile => ({ x: Math.floor(p.x / grid.tileSize), y: Math.floor(p.y / grid.tileSize) });
const poseOf = (d: Director, id = "user-0") => d.pose(id) as AgentPose;

function run(d: Director, seconds: number, each?: () => void): void {
  for (let f = 0; f < seconds * 20; f++) {
    d.tick(50);
    each?.();
  }
}

function director(...people: AgentInput[]): Director {
  const d = new Director(grid, places, 3);
  d.sync(people.length ? people : [person()]);
  return d;
}

describe("person control", () => {
  it("walks to the commanded tile and stays there", () => {
    const d = director();
    expect(d.command("user-0", open)).toBe(true);
    run(d, 40);
    expect(d.arrived("user-0")).toBe(true);
    expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
  });

  it("only ever stands on walkable tiles on the way", () => {
    const d = director();
    d.command("user-0", open);
    run(d, 40, () => {
      const t = tileOf(poseOf(d));
      expect(isWalkable(grid, t.x, t.y) || (t.x === desks[0].x && t.y === desks[0].y)).toBe(true);
    });
  });

  it("refuses a tile that cannot be walked on", () => {
    const d = director();
    const wall = { x: 0, y: 0 };
    expect(isWalkable(grid, wall.x, wall.y)).toBe(false);
    expect(d.command("user-0", wall)).toBe(false);
    expect(d.controlled("user-0")).toBe(false);
  });

  it("ignores people who are not on this map", () => {
    expect(director().command("nobody", open)).toBe(false);
  });

  it("changes course mid-walk without leaving the path", () => {
    const d = director();
    d.command("user-0", open);
    run(d, 1);
    expect(d.command("user-0", other)).toBe(true);
    run(d, 40);
    expect(tileOf(poseOf(d))).toEqual({ x: other.x, y: other.y });
  });

  it("stops the automatic day while held, then resumes after no input", () => {
    const d = director();
    d.command("user-0", open);
    const holdSeconds = CONTROL_RESUME_MS / 1000;
    run(d, holdSeconds - 1);
    expect(d.controlled("user-0")).toBe(true);
    expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
    run(d, 2);
    expect(d.controlled("user-0")).toBe(false);
    // Back to its day: within a while the character has left the tile it was sent to.
    let left = false;
    run(d, 90, () => {
      const t = tileOf(poseOf(d));
      if (t.x !== open.x || t.y !== open.y) left = true;
    });
    expect(left).toBe(true);
  });

  it("each new command restarts the wait", () => {
    const d = director();
    d.command("user-0", open);
    run(d, CONTROL_RESUME_MS / 1000 - 5);
    d.command("user-0", other);
    run(d, CONTROL_RESUME_MS / 1000 - 5);
    expect(d.controlled("user-0")).toBe(true);
  });

  it("a status change does not pull a held character away", () => {
    const d = director();
    d.command("user-0", open);
    run(d, 30);
    d.sync([{ ...person(), status: "focus" }]);
    run(d, 5);
    expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
  });

  it("nobody drags a held character into a chat", () => {
    const d = director(person(0), person(1), person(2), person(3));
    d.command("user-0", open);
    run(d, CONTROL_RESUME_MS / 1000 - 1, () => {
      expect(poseOf(d).activity).toBe("wander");
    });
  });

  it("restores a saved position without walking", () => {
    const d = director();
    expect(d.place("user-0", open)).toBe(true);
    expect(d.arrived("user-0")).toBe(true);
    expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
  });

  it("a hold keeps someone still for a dance and then lets go", () => {
    const d = director();
    d.hold("user-0", 3_000);
    const start = poseOf(d);
    run(d, 2.5);
    expect(poseOf(d).x).toBe(start.x);
    expect(poseOf(d).y).toBe(start.y);
    run(d, 1);
    expect(d.controlled("user-0")).toBe(false);
  });

  it("two people walk up to each other and end side by side", () => {
    const d = director(person(0), person(1));
    expect(d.meet("user-0", "user-1")).toBe(true);
    for (let f = 0; f < 18 * 20 && !(d.arrived("user-0") && d.arrived("user-1")); f++) d.tick(50);
    expect(d.arrived("user-0") && d.arrived("user-1")).toBe(true);
    const [a, b] = [tileOf(poseOf(d, "user-0")), tileOf(poseOf(d, "user-1"))];
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
  });

  it("nobody can meet themselves or someone who isn't here", () => {
    const d = director();
    expect(d.meet("user-0", "user-0")).toBe(false);
    expect(d.meet("user-0", "nobody")).toBe(false);
  });

  describe("reduced motion", () => {
    it("appears on the tile instead of walking and stays there", () => {
      const d = director();
      d.setMotion(false);
      expect(d.command("user-0", open)).toBe(true);
      expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
      expect(poseOf(d).anim).toBe("idle");
      run(d, 5);
      expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
    });

    it("does not send someone who was placed back home on a status change", () => {
      const d = director();
      d.setMotion(false);
      d.place("user-0", open);
      d.sync([{ ...person(), status: "break" }]);
      expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
    });

    it("keeps a held character where it was sent when motion is turned off mid-walk", () => {
      const d = director();
      d.command("user-0", open);
      run(d, 0.5);
      d.setMotion(false);
      expect(tileOf(poseOf(d))).toEqual({ x: open.x, y: open.y });
    });

    it("does not walk two people together", () => {
      const d = director(person(0), person(1));
      d.setMotion(false);
      expect(d.meet("user-0", "user-1")).toBe(false);
    });
  });
});

describe("resolveFloorTap", () => {
  it("keeps a walkable tile", () => {
    expect(resolveFloorTap(grid, { x: open.x, y: open.y })).toEqual({ x: open.x, y: open.y });
  });

  it("slides to a walkable tile touching the one tapped", () => {
    const blocked = places.open
      .flatMap((s) => [{ x: s.x + 1, y: s.y }, { x: s.x - 1, y: s.y }, { x: s.x, y: s.y + 1 }, { x: s.x, y: s.y - 1 }])
      .find((t) => t.x > 0 && t.y > 0 && t.x < grid.width - 1 && t.y < grid.height - 1 && !isWalkable(grid, t.x, t.y)) as Tile;
    const resolved = resolveFloorTap(grid, blocked) as Tile;
    expect(isWalkable(grid, resolved.x, resolved.y)).toBe(true);
    expect(Math.abs(resolved.x - blocked.x) + Math.abs(resolved.y - blocked.y)).toBe(1);
  });

  it("ignores taps outside the map", () => {
    expect(resolveFloorTap(grid, { x: -1, y: 3 })).toBeNull();
    expect(resolveFloorTap(grid, { x: grid.width, y: 3 })).toBeNull();
  });
});
