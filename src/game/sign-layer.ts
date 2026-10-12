import type Phaser from "phaser";

import { gameFonts } from "./fonts";
import { SIGN_EDGE, SIGN_PLATE, SIGN_TEXT, type SignDef, resolveAccent, signScale, signText, textResolution } from "./signage";

export type Signage = { labels: Record<string, string>; teamColors: Record<string, string>; rtl: boolean };

const FONT_SIZE = 9;
const PAD_X = 5;
const PAD_Y = 2;
const ACCENT_W = 3;
const SIGN_DEPTH = 8; // above floor and furniture, below characters (10 + y)

type Sign = { def: SignDef; container: Phaser.GameObjects.Container; plate: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text };

/**
 * Pixel-style signs for rooms and team pods: black plate, yellow lettering,
 * an accent strip at the reading start (left in English, right in Arabic).
 * Labels come from the page (translated); text re-renders at the camera zoom
 * so it stays sharp, and signs grow a little when zoomed far out.
 */
export class SignLayer {
  private readonly signs: Sign[] = [];
  private signage: Signage | null = null;
  private zoom = 0;
  private scale = 1;
  private resolution = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    defs: SignDef[],
  ) {
    for (const def of defs) {
      const plate = scene.add.graphics();
      const text = scene.add
        .text(0, 0, "", { fontFamily: gameFonts().sign, fontSize: `${FONT_SIZE}px`, fontStyle: "700", color: SIGN_TEXT, resolution: 2 })
        .setOrigin(0.5, 0.5);
      const container = scene.add.container(def.x, def.y, [plate, text]).setDepth(SIGN_DEPTH).setVisible(false);
      this.signs.push({ def, container, plate, text });
    }
  }

  apply(signage: Signage): void {
    this.signage = signage;
    this.redraw();
  }

  /** Call when the camera zoom may have changed; cheap when it hasn't moved enough to matter. */
  setZoom(zoom: number): void {
    const scale = signScale(zoom, FONT_SIZE);
    const resolution = textResolution(zoom, scale);
    this.zoom = zoom;
    if (scale === this.scale && resolution === this.resolution) return;
    this.scale = scale;
    this.resolution = resolution;
    this.redraw();
  }

  /** Re-measure after web fonts load. */
  refresh(): void {
    this.redraw();
  }

  private redraw(): void {
    const signage = this.signage;
    if (!signage || this.zoom === 0) return;
    for (const sign of this.signs) {
      const label = signage.labels[sign.def.key];
      sign.container.setVisible(Boolean(label));
      if (!label) continue;
      // No setRTL: Phaser 3.90 places RTL lines at width x resolution, off the canvas when resolution > 1.
      // The browser's text shaping already orders a single Arabic line correctly.
      sign.text.setResolution(this.resolution).setText(signText(label));
      this.drawPlate(sign, resolveAccent(sign.def.accent, signage.teamColors), signage.rtl);
      sign.container.setScale(this.scale);
    }
  }

  private drawPlate(sign: Sign, accent: string, rtl: boolean): void {
    // Whole pixels so the plate edges stay crisp.
    const w = Math.ceil(sign.text.width / 2) * 2 + PAD_X * 2 + ACCENT_W;
    const h = Math.ceil(sign.text.height) + PAD_Y * 2;
    const left = -w / 2;
    const top = -Math.round(h / 2);
    const color = (hex: string) => parseInt(hex.slice(1), 16);
    sign.plate
      .clear()
      .fillStyle(0x000000, 0.25)
      .fillRect(left - 1, top + 1, w + 2, h + 2) // drop shadow, peeking out below
      .fillStyle(color(SIGN_EDGE))
      .fillRect(left - 1, top - 1, w + 2, h + 2)
      .fillStyle(color(SIGN_PLATE))
      .fillRect(left, top, w, h)
      .fillStyle(color(accent))
      .fillRect(rtl ? left + w - ACCENT_W : left, top, ACCENT_W, h);
    // Centre the text in the plate area beside the accent strip.
    sign.text.setPosition(rtl ? -ACCENT_W / 2 : ACCENT_W / 2, 0);
  }

  destroy(): void {
    for (const sign of this.signs) sign.container.destroy();
    this.signs.length = 0;
  }
}
