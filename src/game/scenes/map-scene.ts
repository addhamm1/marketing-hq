import Phaser from "phaser";

import type { MapSceneApi, SceneBridge } from "../bridge";
import { CameraController } from "../camera";
import type { SheetInfo } from "../character-view";
import { CharacterManager } from "../characters";
import { buildMap, queueMap } from "../map-loader";
import { ensureSharedTextures, fallbackSheet } from "../textures";
import type { MapCharacter } from "../types";
import { ZoneLayer, readZones } from "../zones";

export const MAP_SCENE_KEY = "pixel-map";

type SceneData = { bridge: SceneBridge };

/**
 * Renders one Tiled map with its zones and characters. Restarted (not
 * recreated) on map switch; everything it creates is torn down on shutdown.
 * There is no `update()`: nothing runs per frame besides Phaser's own render.
 */
export class MapScene extends Phaser.Scene implements MapSceneApi {
  private bridge!: SceneBridge;
  private camera: CameraController | null = null;
  private zoneLayer: ZoneLayer | null = null;
  private characters: CharacterManager | null = null;

  constructor() {
    super({ key: MAP_SCENE_KEY });
  }

  init(data: SceneData): void {
    this.bridge = data.bridge;
  }

  preload(): void {
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) =>
      console.warn(`Pixel map: could not load ${file.src}`),
    );
    queueMap(this, this.bridge.mapKey);
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    ensureSharedTextures(this);
    const map = buildMap(this, this.bridge.mapKey);
    if (!map) {
      this.bridge.zones = [];
      return;
    }
    const zones = readZones(map);
    this.bridge.zones = zones.map((z) => z.name);

    const camera = new CameraController(this, map.widthInPixels, map.heightInPixels);
    const isGesture = () => camera.wasGesture();
    this.camera = camera;
    this.zoneLayer = new ZoneLayer(this, zones, isGesture, this.bridge.options.onZoneClick);
    this.characters = new CharacterManager(this, new Map(zones.map((z) => [z.name, z])), {
      sheetFor: (c) => this.sheetFor(c),
      isGesture,
      onClick: this.bridge.options.onCharacterClick,
    });
    this.bridge.scene = this;
    this.applyCharacters(this.bridge.characters);
  }

  applyCharacters(characters: MapCharacter[]): void {
    this.characters?.set(characters);
  }

  refreshLabels(): void {
    this.characters?.refreshLabels();
  }

  private sheetFor(c: MapCharacter): SheetInfo {
    const { width, height } = this.bridge.frameSize;
    return {
      canvas: c.sheet ?? this.bridge.defaultSheet ?? fallbackSheet(width),
      frameWidth: width,
      frameHeight: height,
      idle: this.bridge.idle,
      downRow: this.bridge.downRow,
    };
  }

  private teardown(): void {
    if (this.bridge.scene === this) this.bridge.scene = null;
    this.characters?.destroy();
    this.zoneLayer?.destroy();
    this.camera?.destroy();
    this.characters = null;
    this.zoneLayer = null;
    this.camera = null;
  }
}
