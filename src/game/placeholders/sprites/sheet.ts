import { PixelBuffer } from "../pixels";
import { type LayerDraw, POSES, type View } from "./anatomy";

export const FRAME = 32;
export const COLUMNS = 6;
export const DIRECTIONS = ["down", "left", "right", "up"] as const;

/**
 * Render one layer option into a 6x4 sheet (192x128): rows down/left/right/up,
 * columns 0-1 idle, 2-5 walk. The right row is the mirrored left row.
 */
export function buildSheet(draw: LayerDraw): PixelBuffer {
  const sheet = new PixelBuffer(FRAME * COLUMNS, FRAME * DIRECTIONS.length);
  DIRECTIONS.forEach((dir, row) => {
    const view: View = dir === "right" ? "left" : dir;
    POSES.forEach((pose, col) => {
      const frame = new PixelBuffer(FRAME, FRAME);
      draw({ buf: frame, view, pose });
      sheet.blit(frame, 0, 0, FRAME, FRAME, col * FRAME, row * FRAME, dir === "right");
    });
  });
  return sheet;
}
