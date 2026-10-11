import type { ManifestAnimation, SpriteManifest } from "./avatar/types";
import type { MapCharacter, PixelGameOptions } from "./types";

/** What the engine needs from the running map scene. */
export interface MapSceneApi {
  applyCharacters(characters: MapCharacter[]): void;
  refreshLabels(): void;
}

const DEFAULT_IDLE: ManifestAnimation = { frames: [0, 1], frameRate: 2 };

/**
 * Shared state between the engine (outside Phaser) and the map scene, which
 * is recreated on every map switch. Plain data, no Phaser types.
 */
export class SceneBridge {
  mapKey: string;
  characters: MapCharacter[] = [];
  zones: string[] = [];
  manifest: SpriteManifest | null = null;
  defaultSheet: HTMLCanvasElement | null = null;
  scene: MapSceneApi | null = null;

  constructor(readonly options: PixelGameOptions) {
    this.mapKey = options.mapKey;
  }

  get frameSize(): { width: number; height: number } {
    return { width: this.manifest?.frameWidth ?? 32, height: this.manifest?.frameHeight ?? 32 };
  }

  get idle(): ManifestAnimation {
    return this.manifest?.animations.idle ?? DEFAULT_IDLE;
  }

  /** Row of the front-facing direction in the sheet. */
  get downRow(): number {
    return Math.max(0, this.manifest?.directions.indexOf("down") ?? 0);
  }
}
