import { TiledMapBuilder } from "./tiled";

/**
 * HQ office floor, 32x20 tiles.
 *
 *   row 0-1   outer wall + windows, kanban wall and notice board on the wall
 *   x 1-7     cafe corner (top-left)       x 9-15  glass meeting room
 *   x 25-30   video studio (top-right)     x 10-19 open desk clusters (16 desks)
 *   x 1-8     reception + mailbox by the entrance (bottom-left), trophy shelf on the left wall
 *   x 22-30   lounge with sofas and bookshelves (bottom-right)
 */
export function buildHqMap(): TiledMapBuilder {
  const m = new TiledMapBuilder(32, 20);
  const W = m.width;
  const H = m.height;

  // Floors
  m.fill("floor", 0, 0, W, H, (x, y) => ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? "floor-a" : "floor-b"));
  m.fill("floor", 1, 2, 7, 6, "wood-floor"); // cafe
  m.fill("floor", 9, 2, 7, 6, "carpet"); // meeting room
  m.fill("floor", 25, 2, 6, 6, "studio-floor"); // studio
  m.fill("floor", 24, 12, 5, 4, "rug"); // lounge rug
  m.fill("floor", 1, 14, 6, 4, "floor-b"); // reception

  // Outer walls
  m.fill("walls", 0, 0, W, 1, "wall-top");
  m.fill("walls", 0, H - 1, W, 1, "wall-top");
  m.fill("walls", 0, 0, 1, H, "wall-top");
  m.fill("walls", W - 1, 0, 1, H, "wall-top");
  m.fill("walls", 1, 1, W - 2, 1, "wall");
  for (const x of [2, 4, 6, 10, 12, 14, 17, 21]) m.put("walls", x, 1, "window");
  m.put("walls", 4, H - 1, "door").put("walls", 5, H - 1, "door"); // entrance

  // Glass meeting room
  m.fill("walls", 8, 2, 1, 6, "glass-v");
  m.fill("walls", 16, 2, 1, 6, "glass-v");
  m.fill("walls", 8, 8, 9, 1, "glass-h");
  m.put("walls", 12, 8, null); // open doorway

  // Studio: solid walls for sound, one door
  m.fill("walls", 24, 1, 1, 8, "wall-top");
  m.fill("walls", 24, 8, 7, 1, "wall-top");
  m.put("walls", 27, 8, "door");

  // Cafe corner
  m.fill("furniture", 1, 2, 4, 1, "cafe-counter");
  m.put("furniture", 5, 2, "coffee-machine");
  m.put("furniture", 7, 2, "plant");
  m.put("furniture", 2, 5, "cafe-table").put("furniture", 5, 5, "cafe-table").put("furniture", 3, 7, "cafe-table");

  // Meeting room
  m.fill("furniture", 10, 3, 5, 1, "chair");
  m.fill("furniture", 10, 4, 5, 1, "meeting-table");
  m.fill("furniture", 10, 5, 5, 1, "chair");
  m.put("furniture", 15, 2, "plant").put("furniture", 9, 7, "plant");

  // Kanban wall and notice board hang on the top wall
  m.fill("furniture", 18, 1, 3, 1, "kanban");
  m.fill("furniture", 22, 1, 2, 1, "notice-board");

  // Studio
  m.fill("furniture", 26, 2, 4, 1, "studio-backdrop");
  m.put("furniture", 25, 4, "studio-light").put("furniture", 30, 4, "studio-light");
  m.put("furniture", 25, 7, "plant");

  // Desk clusters: desk on top, chair below; each desk zone is 1x2 tiles
  let n = 1;
  for (const deskY of [10, 14]) {
    for (const startX of [10, 16]) {
      for (let i = 0; i < 4; i++) {
        const x = startX + i;
        m.put("furniture", x, deskY, "desk").put("furniture", x, deskY + 1, "chair");
        m.zone(`desk-${n++}`, x, deskY, 1, 2, "desk");
      }
    }
  }
  for (const [x, y] of [[9, 10], [14, 10], [20, 14], [9, 14], [15, 17]] as const) m.put("furniture", x, y, "plant");

  // Reception by the entrance
  m.fill("furniture", 2, 15, 4, 1, "reception-desk");
  m.put("furniture", 1, 14, "plant").put("furniture", 6, 14, "plant");
  m.put("furniture", 1, 17, "sofa");
  m.put("furniture", 8, 17, "mailbox");

  // Trophy shelf and books on the left wall
  m.fill("furniture", 1, 10, 1, 2, "trophy-shelf");
  m.put("furniture", 1, 12, "bookshelf");

  // Lounge
  m.fill("furniture", 26, 9, 4, 1, "bookshelf");
  m.fill("furniture", 24, 11, 5, 1, "sofa");
  m.fill("furniture", 24, 16, 5, 1, "sofa");
  m.put("furniture", 26, 13, "cafe-table");
  m.put("furniture", 30, 10, "plant").put("furniture", 22, 18, "plant").put("furniture", 30, 18, "plant");

  // Feature zones (clickable)
  m.zone("reception", 1, 14, 6, 4, "feature");
  m.zone("meeting-room", 9, 2, 7, 6, "feature");
  m.zone("studio", 25, 2, 6, 6, "feature");
  m.zone("kanban-wall", 18, 1, 3, 2, "feature");
  m.zone("notice-board", 22, 1, 2, 2, "feature");
  m.zone("mailbox", 8, 16, 1, 2, "feature");
  m.zone("cafe", 1, 2, 7, 6, "feature");
  m.zone("trophy-shelf", 1, 10, 1, 2, "feature");
  return m;
}
