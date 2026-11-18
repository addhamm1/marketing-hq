"use client";

import { Bookmark, Dices, Loader2, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEASONAL_ITEMS, type SeasonalEvent, activeSeasonalItems, resolveSeasonal } from "@/game/avatar/seasonal";
import type { AvatarConfig, SavedLook, SpriteManifest } from "@/game/avatar/types";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { markAvatarSeen, saveAvatar } from "./actions";
import { LooksPanel } from "./looks-panel";
import { OptionGrid } from "./option-grid";
import { SeasonalPanel } from "./seasonal-panel";
import { SpriteThumb } from "./sprite-thumb";
import { Stage } from "./stage";
import { Swatches } from "./swatches";
import { useCreator } from "./use-creator";

const NO_ITEMS: ReadonlySet<string> = new Set();
const TAB = "h-auto min-w-16 shrink-0 flex-col gap-1 px-2 py-1.5 text-xs";

export type WorkspaceProps = {
  manifest: SpriteManifest;
  start: AvatarConfig;
  initialLooks: SavedLook[];
  events: SeasonalEvent[];
  eventsFailed: boolean;
  today: string;
  welcome: boolean;
};

export function Workspace({ manifest, start, initialLooks, events, eventsFailed, today, welcome }: WorkspaceProps) {
  const t = useTranslations("character");
  const message = useMessage();
  const router = useRouter();
  const active = useMemo(() => activeSeasonalItems(events, today), [events, today]);
  const creator = useCreator(manifest, start, active);
  const { draft, worn } = creator;
  const [looks, setLooks] = useState(initialLooks);
  const [pending, startTransition] = useTransition();

  const toggleSeasonal = (id: string) => {
    const layer = SEASONAL_ITEMS[id];
    creator.pick(layer, worn[layer] === id ? (resolveSeasonal(draft, manifest, NO_ITEMS)[layer] ?? null) : id);
  };

  const save = () => startTransition(async () => {
    const result = await saveAvatar(draft);
    if (!result.ok) return void toast.error(message(result.error));
    creator.markSaved();
    toast.success(t("saved"));
    if (welcome) router.push("/map");
    else router.refresh();
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr] lg:gap-6">
      <div className="bg-background/95 sticky top-14 z-20 -mx-4 border-b px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:top-20 lg:self-start lg:p-4">
        <Stage config={worn} manifest={manifest} />
      </div>

      <div className="min-w-0 space-y-4">
        <Tabs defaultValue={manifest.layers[0]?.key}>
          <TabsList className="w-full justify-start gap-1 overflow-x-auto group-data-horizontal/tabs:h-auto">
            {manifest.layers.map((l) => (
              <TabsTrigger key={l.key} value={l.key} className={TAB}>
                <SpriteThumb config={worn} manifest={manifest} view={l.key} className="size-8" />
                {t(`layers.${l.key}`)}
              </TabsTrigger>
            ))}
            <TabsTrigger value="seasonal" className={TAB}><Sparkles className="size-8 p-1.5" aria-hidden />{t("tabs.seasonal")}</TabsTrigger>
            <TabsTrigger value="looks" className={TAB}><Bookmark className="size-8 p-1.5" aria-hidden />{t("tabs.looks")}</TabsTrigger>
          </TabsList>
          {manifest.layers.map((layer) => (
            <TabsContent key={layer.key} value={layer.key} className="mt-4 space-y-5">
              <OptionGrid layer={layer} manifest={manifest} worn={worn} onPick={(id) => creator.pick(layer.key, id)} />
              <Swatches layer={layer} manifest={manifest} worn={worn} onPick={creator.setColor} />
            </TabsContent>
          ))}
          <TabsContent value="seasonal" className="mt-4">
            <SeasonalPanel events={events} failed={eventsFailed} today={today} manifest={manifest} worn={worn} onToggle={toggleSeasonal} />
          </TabsContent>
          <TabsContent value="looks" className="mt-4">
            <LooksPanel looks={looks} worn={worn} manifest={manifest} onApply={creator.applyLook} onSaved={setLooks} />
          </TabsContent>
        </Tabs>

        <div className="bg-card/95 sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-1 rounded-xl border p-1.5 backdrop-blur md:bottom-4">
          <Button type="button" size="icon" variant="ghost" className="size-11" aria-label={t("undo")} disabled={!creator.canUndo} onClick={creator.undo}><Undo2 aria-hidden /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-11" aria-label={t("reset")} disabled={!creator.dirty} onClick={creator.reset}><RotateCcw aria-hidden /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-11" aria-label={t("randomise")} onClick={creator.randomise}><Dices aria-hidden /></Button>
          <Button type="button" className="ms-auto min-h-11 min-w-0 flex-1 sm:flex-none" disabled={pending} onClick={save}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}{t("save")}
          </Button>
        </div>
        {welcome ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => startTransition(async () => { await markAvatarSeen(); router.push("/map"); })}>{t("skip")}</Button>
        ) : null}
      </div>
    </div>
  );
}
