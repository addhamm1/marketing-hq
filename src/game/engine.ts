import Phaser from "phaser";

import { loadManifest, renderSheet } from "./avatar/compositor";
import { defaultConfig } from "./avatar/config";
import { SceneBridge } from "./bridge";
import { loadGameFonts } from "./fonts";
import { MAP_SCENE_KEY, MapScene } from "./scenes/map-scene";
import type { MapCharacter, MapSignage, PixelGameOptions } from "./types";

/** The running Phaser game behind a `PixelGameController`. Browser only. */
export interface Engine {
  setCharacters(characters: MapCharacter[]): void;
  setSignage(signage: MapSignage): void;
  setFocus(userId: string | null): void;
  setMap(mapKey: string): void;
  getZones(): string[];
  destroy(): void;
}

export function startEngine(
  parent: HTMLElement,
  options: PixelGameOptions,
  initial: { mapKey: string; characters: MapCharacter[]; signage: MapSignage | null; focus: string | null },
): Engine {
  const bridge = new SceneBridge(options);
  bridge.mapKey = initial.mapKey;
  bridge.characters = initial.characters;
  bridge.signage = initial.signage;
  bridge.focus = initial.focus;
  let destroyed = false;

  // Characters walk about unless the user asked the system for less motion.
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  bridge.motion = !reducedMotion?.matches;
  const onMotionChange = (event: MediaQueryListEvent) => {
    bridge.motion = !event.matches;
    bridge.scene?.applyMotion();
  };
  reducedMotion?.addEventListener("change", onMotionChange);
  // Walking needs smooth frames; a still map (reduced motion) is fine at 30.
  const fps = bridge.motion ? 60 : 30;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#13232c",
    banner: false,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    disableContextMenu: true,
    audio: { noAudio: true },
    fps: { target: fps, limit: fps },
    render: { powerPreference: "low-power" },
    input: { activePointers: 2, keyboard: false, gamepad: false },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: Math.max(1, parent.clientWidth),
      height: Math.max(1, parent.clientHeight),
    },
  });
  game.scene.add(MAP_SCENE_KEY, MapScene, true, { bridge });

  // Follow the parent element, not just the window.
  const observer = new ResizeObserver((entries) => {
    const box = entries[0]?.contentRect;
    if (!box || box.width < 1 || box.height < 1 || destroyed) return;
    game.scale.refresh();
  });
  observer.observe(parent);

  // Default character for users without a composed sheet.
  loadManifest()
    .then(async (manifest) => {
      bridge.manifest = manifest;
      bridge.defaultSheet = await renderSheet(defaultConfig(manifest), manifest);
      if (!destroyed) bridge.scene?.applyCharacters(bridge.characters);
    })
    .catch((error: unknown) => console.warn("Pixel map: using fallback characters", error));

  // Re-render name tags and signs once the page's web fonts are ready.
  Promise.all([document.fonts?.ready, loadGameFonts()])
    .then(() => {
      if (!destroyed) bridge.scene?.refreshLabels();
    })
    .catch(() => undefined);

  return {
    setCharacters(characters) {
      bridge.characters = characters;
      bridge.scene?.applyCharacters(characters);
    },
    setSignage(signage) {
      bridge.signage = signage;
      bridge.scene?.applySignage();
    },
    setFocus(userId) {
      bridge.focus = userId;
      bridge.scene?.applyFocus();
    },
    setMap(mapKey) {
      bridge.mapKey = mapKey;
      bridge.zones = [];
      const scene = game.scene.getScene(MAP_SCENE_KEY);
      if (scene && scene.sys.settings.status >= Phaser.Scenes.LOADING) scene.scene.restart({ bridge });
    },
    getZones() {
      return [...bridge.zones];
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      reducedMotion?.removeEventListener("change", onMotionChange);
      bridge.scene = null;
      bridge.characters = [];
      // Phaser does not release the WebGL context itself; browsers cap how many can live at once.
      const renderer = game.renderer;
      if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        const gl = renderer.gl;
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          queueMicrotask(() => gl.getExtension("WEBGL_lose_context")?.loseContext());
        });
      }
      game.destroy(true);
    },
  };
}
