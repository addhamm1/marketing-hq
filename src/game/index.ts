import type { Engine } from "./engine";
import type { MapCharacter, MapPosition, MapSignage, PixelGameController, PixelGameOptions } from "./types";

export type {
  CharacterStatus,
  MapCharacter,
  MapInteraction,
  MapInteractionKind,
  MapPosition,
  MapSignage,
  MapTile,
  PixelGameController,
  PixelGameOptions,
} from "./types";

/**
 * Create the pixel map inside `parent`. Phaser itself is loaded lazily on the
 * first call, so importing this module never touches `window` (still, load it
 * from a client component via `next/dynamic` with `ssr: false`).
 *
 * Calls made before the engine is ready are remembered and applied once it is.
 */
export function createPixelGame(parent: HTMLElement, options: PixelGameOptions): PixelGameController {
  const state: {
    mapKey: string;
    characters: MapCharacter[];
    signage: MapSignage | null;
    focus: string | null;
    player: string | null;
    positions: MapPosition[];
  } = {
    mapKey: options.mapKey,
    characters: [],
    signage: null,
    focus: null,
    player: null,
    positions: [],
  };
  let engine: Engine | null = null;
  let destroyed = false;

  import("./engine")
    .then(({ startEngine }) => {
      if (destroyed) return;
      engine = startEngine(parent, options, state);
    })
    .catch((error: unknown) => console.error("Pixel map failed to start", error));

  return {
    setCharacters(characters) {
      state.characters = characters;
      engine?.setCharacters(characters);
    },
    setSignage(signage) {
      state.signage = signage;
      engine?.setSignage(signage);
    },
    setFocus(userId) {
      state.focus = userId;
      engine?.setFocus(userId);
    },
    setPlayer(userId) {
      state.player = userId;
      engine?.setPlayer(userId);
    },
    setPositions(positions) {
      state.positions = positions;
      engine?.setPositions(positions);
    },
    moveCharacter(userId, tile) {
      engine?.moveCharacter(userId, tile);
    },
    playInteraction(interaction) {
      engine?.playInteraction(interaction);
    },
    celebrate(userId) {
      engine?.celebrate(userId);
    },
    setMap(mapKey) {
      if (mapKey === state.mapKey) return;
      state.mapKey = mapKey;
      engine?.setMap(mapKey);
    },
    getZones() {
      return engine?.getZones() ?? [];
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      engine?.destroy();
      engine = null;
    },
  };
}
