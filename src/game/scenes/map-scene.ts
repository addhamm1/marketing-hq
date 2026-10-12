import Phaser from "phaser";

import { ensureActivityTextures } from "../activity-art";
import type { MapSceneApi, SceneBridge } from "../bridge";
import { CameraController } from "../camera";
import type { SheetInfo } from "../character-view";
import { CharacterManager } from "../characters";
import { parseNavGrid } from "../life/grid";
import { buildMap, mapCacheKey, queueMap } from "../map-loader";
import { SignLayer } from "../sign-layer";
import { readSigns, textResolution } from "../signage";
import { ensureSharedTextures, fallbackSheet } from "../textures";
import type { MapCharacter } from "../types";
import { ZoneLayer, readZones } from "../zones";

export const MAP_SCENE_KEY = "pixel-map";
const ZOOM_SETTLE_MS = 150; // re-render text once a pinch or wheel zoom pauses

type SceneData = { bridge: SceneBridge };

/**
 * Renders one Tiled map with its zones, signs and characters. Restarted (not
 * recreated) on map switch; everything it creates is torn down on shutdown.
 * `update()` advances the characters' simulation and keeps text crisp.
 */
export class MapScene extends Phaser.Scene implements MapSceneApi {
  private bridge!: SceneBridge;
  private camera: CameraController | null = null;
  private zoneLayer: ZoneLayer | null = null;
  private characters: CharacterManager | null = null;
  private signs: SignLayer | null = null;
  private lastZoom = 0;
  private zoomSettleAt = 0;
  private labelResolution = 0;

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
    ensureActivityTextures(this);
    const map = buildMap(this, this.bridge.mapKey);
    if (!map) {
      this.bridge.zones = [];
      return;
    }
    const json: unknown = (this.cache.tilemap.get(mapCacheKey(this.bridge.mapKey)) as { data?: unknown } | undefined)?.data;
    const zones = readZones(map);
    this.bridge.zones = zones.map((z) => z.name);

    const camera = new CameraController(this, map.widthInPixels, map.heightInPixels);
    const isGesture = () => camera.wasGesture();
    this.camera = camera;
    this.zoneLayer = new ZoneLayer(this, zones, isGesture, this.bridge.options.onZoneClick);
    this.signs = new SignLayer(this, readSigns(json));
    this.characters = new CharacterManager(this, new Map(zones.map((z) => [z.name, z])), parseNavGrid(json), {
      sheetFor: (c) => this.sheetFor(c),
      isGesture,
      onClick: this.bridge.options.onCharacterClick,
    });
    this.bridge.scene = this;
    this.applyCharacters(this.bridge.characters);
    this.applyMotion();
    this.applyFocus();
    this.applySignage();
    this.applyZoom();
  }

  update(time: number, delta: number): void {
    this.characters?.tick(delta, time);
    const zoom = this.cameras.main.zoom;
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom;
      this.zoomSettleAt = time + ZOOM_SETTLE_MS;
    } else if (this.zoomSettleAt && time >= this.zoomSettleAt) {
      this.zoomSettleAt = 0;
      this.applyZoom();
    }
  }

  applyCharacters(characters: MapCharacter[]): void {
    this.characters?.set(characters);
  }

  applySignage(): void {
    if (this.bridge.signage) this.signs?.apply(this.bridge.signage);
  }

  applyMotion(): void {
    this.characters?.setMotion(this.bridge.motion);
  }

  applyFocus(): void {
    this.characters?.setFocus(this.bridge.focus);
  }

  refreshLabels(): void {
    this.characters?.refreshLabels();
    this.signs?.refresh();
  }

  /** Re-render name tags and signs at a resolution that matches the zoom. */
  private applyZoom(): void {
    const zoom = this.cameras.main.zoom;
    this.lastZoom = zoom;
    this.signs?.setZoom(zoom);
    const resolution = textResolution(zoom);
    if (resolution !== this.labelResolution) {
      this.labelResolution = resolution;
      this.characters?.refreshLabels(resolution);
    }
  }

  private sheetFor(c: MapCharacter): SheetInfo {
    const { width, height } = this.bridge.frameSize;
    return {
      canvas: c.sheet ?? this.bridge.defaultSheet ?? fallbackSheet(width),
      frameWidth: width,
      frameHeight: height,
      idle: this.bridge.idle,
      walk: this.bridge.walk,
      directions: this.bridge.directions,
    };
  }

  private teardown(): void {
    if (this.bridge.scene === this) this.bridge.scene = null;
    this.characters?.destroy();
    this.zoneLayer?.destroy();
    this.signs?.destroy();
    this.camera?.destroy();
    this.characters = null;
    this.zoneLayer = null;
    this.signs = null;
    this.camera = null;
    this.lastZoom = 0;
    this.labelResolution = 0;
  }
}
