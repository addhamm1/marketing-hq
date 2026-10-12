import type { ManifestAnimation, SpriteManifest } from "./avatar/types";
import type { MapCharacter, MapSignage, PixelGameOptions } from "./types";

/** What the engine needs from the running map scene. */
export interface MapSceneApi {
  applyCharacters(characters: MapCharacter[]): void;
  applySignage(): void;
  applyMotion(): void;
  applyFocus(): void;
  refreshLabels(): void;
}

const DEFAULT_IDLE: ManifestAnimation = { frames: [0, 1], frameRate: 2 };
const DEFAULT_WALK: ManifestAnimation = { frames: [2, 3, 4, 5], frameRate: 8 };

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
  signage: MapSignage | null = null;
  /** False when the user prefers reduced motion: characters stay at their desks. */
  motion = true;
  focus: string | null = null;
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

  get walk(): ManifestAnimation {
    return this.manifest?.animations.walk ?? DEFAULT_WALK;
  }

  get directions(): SpriteManifest["directions"] {
    return this.manifest?.directions ?? ["down", "left", "right", "up"];
  }
}
