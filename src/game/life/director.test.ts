import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CharacterStatus } from "../types";
import type { AgentPose } from "./agent";
import { type AgentInput, Director } from "./director";
import { type NavGrid, type Rect, isWalkable, parseNavGrid } from "./grid";
import { type Places, type Spot, buildPlaces, homeSpot } from "./places";

const json = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../public/maps/hq.json"), "utf8")) as {
  layers: { name: string; objects?: Rect[] }[];
};
const zones = json.layers.find((l) => l.name === "zones")?.objects ?? [];
const grid = parseNavGrid(json) as NavGrid;
const places: Places = buildPlaces(grid, zones);
const desks = zones.filter((z) => /^desk-\d+$/.test(z.name)).map((z) => homeSpot(grid, z) as Spot);

function inputs(statuses: CharacterStatus[]): AgentInput[] {
  return statuses.map((status, i) => ({ id: `user-${i}`, status, home: desks[i] }));
}

const tileOf = (p: AgentPose) => ({ x: Math.floor(p.x / grid.tileSize), y: Math.floor(p.y / grid.tileSize) });
const inList = (p: AgentPose, spots: Spot[]) => spots.some((s) => s.x === tileOf(p).x && s.y === tileOf(p).y);

/** Run the simulation for `seconds` at 30 fps, calling `each` with every pose on every frame. */
function run(director: Director, ids: string[], seconds: number, each?: (id: string, pose: AgentPose) => void): void {
  for (let f = 0; f < seconds * 30; f++) {
    director.tick(1000 / 30);
    if (each) for (const id of ids) each(id, director.pose(id) as AgentPose);
  }
}

describe("Director", () => {
  it("is deterministic for the same seed and inputs", () => {
    const a = new Director(grid, places, 7);
    const b = new Director(grid, places, 7);
    const people = inputs(["available", "break", "available", "meeting"]);
    a.sync(people);
    b.sync(people);
    run(a, [], 90);
    run(b, [], 90);
    for (const p of people) expect(a.pose(p.id)).toEqual(b.pose(p.id));
  });

  it("keeps focused people typing at their desk", () => {
    const d = new Director(grid, places);
    d.sync(inputs(["focus"]));
    run(d, ["user-0"], 300, (_, pose) => {
      expect(tileOf(pose)).toEqual({ x: desks[0].x, y: desks[0].y });
      expect(pose.anim).toBe("type");
    });
  });

  it("puts away people to sleep at their desk with a zzz", () => {
    const d = new Director(grid, places);
    d.sync(inputs(["away"]));
    run(d, [], 60);
    const pose = d.pose("user-0") as AgentPose;
    expect(tileOf(pose)).toEqual({ x: desks[0].x, y: desks[0].y });
    expect(pose).toMatchObject({ anim: "sleep", bubble: "zzz", activity: "sleep" });
  });

  it("sends people in a meeting to the meeting room (or the phone booth)", () => {
    const d = new Director(grid, places);
    const ids = ["user-0", "user-1", "user-2"];
    d.sync(inputs(["meeting", "meeting", "meeting"]));
    run(d, [], 30); // leave the desk
    const settled = new Set<string>();
    const rooms = [...places.seats.meeting, ...places.seats.booth, ...places.floor.booth];
    run(d, ids, 150, (id, pose) => {
      expect(["meeting", "call"]).toContain(pose.activity);
      if (pose.anim !== "walk" && inList(pose, rooms)) settled.add(id);
    });
    expect([...settled].sort()).toEqual(ids);
  });

  it("sends people on a shoot to the studio with a camera", () => {
    const d = new Director(grid, places);
    d.sync(inputs(["shoot"]));
    let filming = false;
    run(d, ["user-0"], 150, (_, pose) => {
      if (pose.activity === "shoot" && pose.prop === "camera" && inList(pose, places.floor.studio)) filming = true;
    });
    expect(filming).toBe(true);
  });

  it("takes breaks in the cafe or lounge, and never stands on a wall", () => {
    const d = new Director(grid, places, 3);
    const people = inputs(["break", "break", "break", "break"]);
    d.sync(people);
    const seen = new Set<string>();
    run(d, people.map((p) => p.id), 600, (_, pose) => {
      const t = tileOf(pose);
      expect(isWalkable(grid, t.x, t.y)).toBe(true);
      seen.add(pose.activity);
    });
    expect([...seen].filter((a) => ["coffee", "dance", "lounge", "chat"].includes(a)).length).toBeGreaterThanOrEqual(2);
    expect(seen.has("work")).toBe(true); // the starting state only
  });

  it("pairs available people up for a face-to-face chat", () => {
    const d = new Director(grid, places, 11);
    const people = inputs(["available", "available", "available", "available", "available", "available"]);
    d.sync(people);
    let faceToFace = false;
    for (let f = 0; f < 30 * 900 && !faceToFace; f++) {
      d.tick(1000 / 30);
      const chatting = people.map((p) => d.pose(p.id) as AgentPose).filter((p) => p.activity === "chat" && p.anim === "idle");
      for (const a of chatting) {
        for (const b of chatting) {
          const ta = tileOf(a);
          const tb = tileOf(b);
          if (ta.y === tb.y && tb.x === ta.x + 1 && a.face === "right" && b.face === "left") faceToFace = true;
        }
      }
    }
    expect(faceToFace).toBe(true);
  });

  it("walks back to the desk when status changes to focus", () => {
    const d = new Director(grid, places, 5);
    d.sync(inputs(["break"]));
    run(d, [], 60);
    d.sync(inputs(["focus"]));
    run(d, [], 60);
    const pose = d.pose("user-0") as AgentPose;
    expect(tileOf(pose)).toEqual({ x: desks[0].x, y: desks[0].y });
    expect(pose.anim).toBe("type");
  });

  it("freezes a paused character and resumes it afterwards", () => {
    const d = new Director(grid, places, 9);
    d.sync(inputs(["break"]));
    run(d, [], 20);
    d.setPaused("user-0");
    const before = d.pose("user-0") as AgentPose;
    run(d, ["user-0"], 30, (_, pose) => {
      expect(pose.x).toBe(before.x);
      expect(pose.y).toBe(before.y);
      expect(pose.anim).toBe("idle");
    });
    d.setPaused(null);
    run(d, [], 60);
    expect(d.pose("user-0")).not.toEqual(before);
  });

  it("with reduced motion, everyone stands still at home", () => {
    const d = new Director(grid, places);
    d.sync(inputs(["break", "available"]));
    run(d, [], 30);
    d.setMotion(false);
    run(d, ["user-0", "user-1"], 30, (id, pose) => {
      const home = desks[Number(id.split("-")[1])];
      expect(tileOf(pose)).toEqual({ x: home.x, y: home.y });
      expect(pose).toMatchObject({ anim: "idle", face: "down", bubble: null, prop: null });
    });
  });

  it("removes characters that left", () => {
    const d = new Director(grid, places);
    d.sync(inputs(["available", "available"]));
    d.sync(inputs(["available"]));
    expect(d.pose("user-1")).toBeNull();
    expect(d.pose("user-0")).not.toBeNull();
  });
});
