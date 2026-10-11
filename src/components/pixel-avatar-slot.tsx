"use client";

import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { configHash, validateAgainstManifest } from "@/game/avatar/config";
import { loadManifest, renderPortrait } from "@/game/avatar/compositor";
import { usePeople } from "./people-context";

/** The user's pixel character as an avatar image (data URL cached by config hash). */
export function PixelAvatar({ userId }: { userId: string; size: number }) {
  const { avatars } = usePeople();
  const config = avatars[userId];
  const [src, setSrc] = useState<string | null>(null);
  const hash = config ? configHash(config) : null;

  useEffect(() => {
    if (!config) return;
    let alive = true;
    loadManifest()
      .then((m) => renderPortrait(validateAgainstManifest(config, m), m, 64))
      .then((url) => alive && setSrc(url))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  if (!src) return null;
  return <AvatarImage src={src} alt="" className="pixelated bg-secondary object-cover" />;
}
