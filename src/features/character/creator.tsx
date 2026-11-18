"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { defaultConfig, validateAgainstManifest } from "@/game/avatar/config";
import { loadManifest } from "@/game/avatar/compositor";
import type { SeasonalEvent } from "@/game/avatar/seasonal";
import type { AvatarConfig, SavedLook, SpriteManifest } from "@/game/avatar/types";
import { Workspace } from "./workspace";

export function CharacterCreator({ initial, initialLooks, events, eventsFailed, today, welcome }: {
  initial: AvatarConfig | null;
  initialLooks: SavedLook[];
  events: SeasonalEvent[];
  eventsFailed: boolean;
  today: string;
  welcome: boolean;
}) {
  const t = useTranslations("character");
  const [manifest, setManifest] = useState<SpriteManifest | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    loadManifest().then(setManifest).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setFailed(false);
    load();
  };

  if (failed) {
    return <ErrorState title={t("loadErrorTitle")} body={t("loadErrorBody")} action={<Button variant="outline" onClick={retry}>{t("retry")}</Button>} />;
  }
  if (!manifest) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label={t("loading")}>
        <Loader2 className="text-muted-foreground animate-spin" aria-hidden />
      </div>
    );
  }
  return (
    <Workspace
      manifest={manifest}
      start={initial ? validateAgainstManifest(initial, manifest) : defaultConfig(manifest)}
      initialLooks={initialLooks}
      events={events}
      eventsFailed={eventsFailed}
      today={today}
      welcome={welcome}
    />
  );
}
