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

/** Translated sign labels by key (`meeting-room`, `pod-creative`, ...) and team colours by team slug. */
export type MapSignage = {
  labels: Record<string, string>;
  teamColors: Record<string, string>;
  /** Right-to-left labels (Arabic): the accent strip moves to the right. */
  rtl: boolean;
};

export type MapTile = { x: number; y: number };
/** Where someone was last seen on this floor. */
export type MapPosition = MapTile & { userId: string };
export type MapInteractionKind = "wave" | "high_five" | "coffee" | "chat" | "dance" | "clap";
/** One person doing something on the floor; `to` is empty for a solo emote. */
export type MapInteraction = { from: string; to: string | null; kind: MapInteractionKind };

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
  /** Open floor was tapped by someone who has no character to move here. */
  onFloorTap?: () => void;
  /** The viewer's character set off for `tile` (`arrived` false), then got there (`arrived` true). */
  onPlayerMove?: (tile: MapTile, arrived: boolean) => void;
};

export interface PixelGameController {
  /** Add, update or remove characters by userId, smoothly. */
  setCharacters(characters: MapCharacter[]): void;
  /** Room and team signs; kept across map switches. */
  setSignage(signage: MapSignage): void;
  /** Hold one character still (its popover is open), or release with null. */
  setFocus(userId: string | null): void;
  /** The character the viewer walks by tapping the floor, or null when they aren't checked in here. */
  setPlayer(userId: string | null): void;
  /** Saved positions for this floor. Each is applied once, when that character appears. */
  setPositions(positions: MapPosition[]): void;
  /** Someone else moved: their character walks to `tile`. */
  moveCharacter(userId: string, tile: MapTile): void;
  /** Show a wave, high five, dance and so on. */
  playInteraction(interaction: MapInteraction): void;
  /** A short confetti burst over this character. */
  celebrate(userId: string): void;
  /** Switch map (branch switcher). Current characters are re-applied to the new map. */
  setMap(mapKey: string): void;
  /** Names of the zone objects in the current map (empty until the map has loaded). */
  getZones(): string[];
  /** Full cleanup: call on React unmount. */
  destroy(): void;
}
