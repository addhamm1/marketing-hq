"use client";

import { useEffect, useState } from "react";
import { defaultConfig, validateAgainstManifest } from "@/game/avatar/config";
import { loadManifest, renderSheet } from "@/game/avatar/compositor";
import type { AvatarConfig } from "@/game/avatar/types";

/** Composed sprite sheets per user (cached by config hash inside the compositor). */
export function useAvatarSheets(userIds: string[], avatars: Record<string, AvatarConfig>) {
  const [sheets, setSheets] = useState<Record<string, HTMLCanvasElement>>({});
  const key = userIds.map((id) => `${id}:${JSON.stringify(avatars[id] ?? null)}`).join("|");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const manifest = await loadManifest();
        const entries = await Promise.all(
          userIds.map(async (id) => {
            const config = avatars[id] ? validateAgainstManifest(avatars[id], manifest) : defaultConfig(manifest);
            return [id, await renderSheet(config, manifest)] as const;
          }),
        );
        if (alive) setSheets(Object.fromEntries(entries));
      } catch {
        // Characters fall back to the engine's placeholder.
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return sheets;
}
