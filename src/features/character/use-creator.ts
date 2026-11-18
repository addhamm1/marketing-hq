"use client";

import { useCallback, useMemo, useState } from "react";
import { configHash, randomConfig, validateAgainstManifest } from "@/game/avatar/config";
import { SEASONAL_LAYERS, pickItem, resolveSeasonal } from "@/game/avatar/seasonal";
import type { AvatarConfig, LayerKey, SeasonalLayer, SpriteManifest } from "@/game/avatar/types";

const HISTORY_LIMIT = 30;

const isSeasonalLayer = (key: LayerKey): key is SeasonalLayer => (SEASONAL_LAYERS as readonly string[]).includes(key);

/**
 * Creator state. `draft` is what gets saved and may keep an out-of-season choice;
 * `worn` is what the person sees and wears today.
 */
export function useCreator(manifest: SpriteManifest, start: AvatarConfig, active: ReadonlySet<string>) {
  const [draft, setDraft] = useState(start);
  const [saved, setSaved] = useState(start);
  const [history, setHistory] = useState<AvatarConfig[]>([]);

  const worn = useMemo(() => resolveSeasonal(draft, manifest, active), [draft, manifest, active]);

  const change = useCallback((next: AvatarConfig) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), draft]);
    setDraft(validateAgainstManifest(next, manifest));
  }, [draft, manifest]);

  const pick = useCallback((key: LayerKey, id: string | null) => {
    change(isSeasonalLayer(key) ? pickItem(draft, manifest, key, id) : ({ ...draft, [key]: id } as AvatarConfig));
  }, [change, draft, manifest]);

  const setColor = useCallback((key: string, color: string) => change({ ...draft, [key]: color } as AvatarConfig), [change, draft]);
  const randomise = useCallback(() => change(randomConfig(manifest, Math.random, active)), [active, change, manifest]);
  const reset = useCallback(() => change(saved), [change, saved]);
  const applyLook = useCallback((look: AvatarConfig) => {
    change(resolveSeasonal(validateAgainstManifest(look, manifest), manifest, active));
  }, [active, change, manifest]);

  const undo = useCallback(() => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setDraft(previous);
    setHistory(history.slice(0, -1));
  }, [history]);

  const markSaved = useCallback(() => setSaved(draft), [draft]);

  return {
    draft,
    worn,
    canUndo: history.length > 0,
    dirty: configHash(draft) !== configHash(saved),
    pick,
    setColor,
    randomise,
    reset,
    undo,
    applyLook,
    markSaved,
  };
}

export type Creator = ReturnType<typeof useCreator>;
