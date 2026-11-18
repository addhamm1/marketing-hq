"use client";

import { useEffect, useRef } from "react";
import { createPixelGame, type MapCharacter, type MapPosition, type MapSignage, type MapTile, type PixelGameController } from "@/game";

type Props = {
  mapKey: string;
  characters: MapCharacter[];
  signage: MapSignage;
  /** Character held still while its popover is open. */
  focusId: string | null;
  /** The viewer's character, when they are checked in on this floor. */
  playerId: string | null;
  positions: MapPosition[];
  onZoneClick: (zone: string) => void;
  onCharacterClick: (userId: string, at: { x: number; y: number }) => void;
  onZones: (zones: string[]) => void;
  onFloorTap: () => void;
  onPlayerMove: (tile: MapTile, arrived: boolean) => void;
  /** Hands the running game to the page, for events that arrive while it is open. */
  onGame: (game: PixelGameController | null) => void;
};

/** Hosts the Phaser game; destroys it on unmount (no leaks across navigations). */
export default function MapCanvas({
  mapKey, characters, signage, focusId, playerId, positions,
  onZoneClick, onCharacterClick, onZones, onFloorTap, onPlayerMove, onGame,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const game = useRef<PixelGameController | null>(null);
  const handlers = useRef({ onZoneClick, onCharacterClick, onZones, onFloorTap, onPlayerMove, onGame });
  useEffect(() => {
    handlers.current = { onZoneClick, onCharacterClick, onZones, onFloorTap, onPlayerMove, onGame };
  });

  useEffect(() => {
    if (!ref.current) return;
    const controller = createPixelGame(ref.current, {
      mapKey,
      onZoneClick: (z) => handlers.current.onZoneClick(z),
      onCharacterClick: (id, at) => handlers.current.onCharacterClick(id, at),
      onFloorTap: () => handlers.current.onFloorTap(),
      onPlayerMove: (tile, arrived) => handlers.current.onPlayerMove(tile, arrived),
    });
    game.current = controller;
    handlers.current.onGame(controller);
    // Zones become available once the map has loaded.
    let tries = 0;
    const poll = setInterval(() => {
      const zones = controller.getZones();
      if (zones.length || ++tries > 50) {
        clearInterval(poll);
        handlers.current.onZones(zones);
      }
    }, 100);
    return () => {
      clearInterval(poll);
      handlers.current.onGame(null);
      controller.destroy();
      game.current = null;
    };
    // The game is created once; map switches go through setMap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = game.current;
    if (!g) return;
    g.setMap(mapKey);
    let tries = 0;
    const poll = setInterval(() => {
      const zones = g.getZones();
      if (zones.length || ++tries > 50) {
        clearInterval(poll);
        handlers.current.onZones(zones);
      }
    }, 100);
    return () => clearInterval(poll);
  }, [mapKey]);

  useEffect(() => {
    game.current?.setPositions(positions);
  }, [positions]);

  useEffect(() => {
    game.current?.setCharacters(characters);
  }, [characters]);

  useEffect(() => {
    game.current?.setSignage(signage);
  }, [signage]);

  useEffect(() => {
    game.current?.setFocus(focusId);
  }, [focusId]);

  useEffect(() => {
    game.current?.setPlayer(playerId);
  }, [playerId]);

  return <div ref={ref} className="absolute inset-0 touch-none" data-testid="pixel-map" />;
}
