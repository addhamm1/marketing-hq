/** Public types of the pixel map. No runtime code, safe to import from server components. */

export type CharacterStatus = "available" | "focus" | "meeting" | "shoot" | "break" | "away";

export type MapCharacter = {
  userId: string;
  name: string;
  /** Name tag colour, `#rrggbb`. */
  teamColor: string;
  status: CharacterStatus;
  /** Zone name to stand at, e.g. "desk-4" or "spot-2". Characters whose spot is not on the current map are not drawn. */
  spot: string;
  /** Composed avatar sheet from `renderSheet`; a default character is used when absent. */
  sheet?: HTMLCanvasElement;
  /** Show a small "on leave" sign at that desk instead of the character. */
  onLeave?: boolean;
};

export type PixelGameOptions = {
  /** "hq" | "field" | "home" | other branch maps later; loads `/maps/<mapKey>.json`. */
  mapKey: string;
  /** Called with a feature zone name (reception, kanban-wall, ...). Desk and spot zones never fire. */
  onZoneClick?: (zoneName: string) => void;
  /**
   * Called when a character (or its on-leave sign) is clicked. `screen` is in CSS
   * pixels relative to the parent element's top-left corner, pointing at the top
   * of the character's head: handy for positioning a popover.
   */
  onCharacterClick?: (userId: string, screen: { x: number; y: number }) => void;
};

export interface PixelGameController {
  /** Add, update or remove characters by userId, smoothly. */
  setCharacters(characters: MapCharacter[]): void;
  /** Switch map (branch switcher). Current characters are re-applied to the new map. */
  setMap(mapKey: string): void;
  /** Names of the zone objects in the current map (empty until the map has loaded). */
  getZones(): string[];
  /** Full cleanup: call on React unmount. */
  destroy(): void;
}
