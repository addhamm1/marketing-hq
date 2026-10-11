"use client";

import { Dices, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultConfig, randomConfig, validateAgainstManifest } from "@/game/avatar/config";
import { loadManifest, renderPortrait, renderSheet } from "@/game/avatar/compositor";
import type { AvatarConfig, LayerKey, ManifestLayer, SpriteManifest } from "@/game/avatar/types";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { markAvatarSeen, saveAvatar } from "./actions";
import { CharacterPreview } from "./preview";

type ColorKey = "skin" | `${LayerKey}Color`;
const colorKey = (layer: ManifestLayer): ColorKey | null =>
  layer.tint === "skin" ? "skin" : layer.tint ? (`${layer.key}Color` as ColorKey) : null;
const pretty = (id: string) => id.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function OptionButton({ config, manifest, layer, optionId, selected, onPick, label }: {
  config: AvatarConfig; manifest: SpriteManifest; layer: LayerKey; optionId: string | null; selected: boolean; onPick: () => void; label: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const preview = { ...config, [layer]: optionId } as AvatarConfig;
    renderPortrait(validateAgainstManifest(preview, manifest), manifest, 64).then((u) => alive && setSrc(u)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [config, manifest, layer, optionId]);
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className={cn("flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[11px] transition-colors", selected ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:bg-muted")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="pixelated size-14" /> : <span className="bg-muted size-14 rounded" />}
      <span className="max-w-16 truncate">{label}</span>
    </button>
  );
}

export function CharacterCreator({ initial, welcome }: { initial: AvatarConfig | null; welcome: boolean }) {
  const t = useTranslations("character");
  const message = useMessage();
  const router = useRouter();
  const [manifest, setManifest] = useState<SpriteManifest | null>(null);
  const [config, setConfig] = useState<AvatarConfig | null>(null);
  const [sheet, setSheet] = useState<HTMLCanvasElement | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    loadManifest().then((m) => {
      setManifest(m);
      setConfig(initial ? validateAgainstManifest(initial, m) : defaultConfig(m));
    });
  }, [initial]);

  useEffect(() => {
    if (!manifest || !config) return;
    let alive = true;
    renderSheet(config, manifest).then((s) => alive && setSheet(s));
    return () => {
      alive = false;
    };
  }, [manifest, config]);

  const layers = useMemo(() => manifest?.layers ?? [], [manifest]);
  if (!manifest || !config) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="text-muted-foreground animate-spin" aria-hidden /></div>;
  }
  const set = (patch: Partial<AvatarConfig>) => setConfig(validateAgainstManifest({ ...config, ...patch }, manifest));

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div className="bg-card flex flex-col items-center gap-4 rounded-2xl border p-6 lg:sticky lg:top-20 lg:self-start">
        <div className="flex size-56 items-end justify-center rounded-xl bg-[radial-gradient(circle_at_50%_70%,var(--accent),transparent_70%)]">
          <CharacterPreview sheet={sheet} manifest={manifest} />
        </div>
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setConfig(randomConfig(manifest))}>
            <Dices aria-hidden /> {t("randomise")}
          </Button>
          <Button className="flex-1" disabled={pending}
            onClick={() => startTransition(async () => {
              const r = await saveAvatar(config);
              if (!r.ok) return void toast.error(message(r.error));
              toast.success(t("saved"));
              if (welcome) router.push("/map");
              else router.refresh();
            })}>
            {t("save")}
          </Button>
        </div>
        {welcome ? (
          <Button variant="ghost" size="sm" onClick={() => startTransition(async () => { await markAvatarSeen(); router.push("/map"); })}>
            {t("skip")}
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue={layers[0]?.key}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {layers.map((l) => <TabsTrigger key={l.key} value={l.key}>{t(`layers.${l.key}`)}</TabsTrigger>)}
        </TabsList>
        {layers.map((layer) => {
          const ck = colorKey(layer);
          const current = (config as Record<string, unknown>)[layer.key] as string | null | undefined;
          const palette = layer.tint ? manifest.palettes[layer.tint] : [];
          return (
            <TabsContent key={layer.key} value={layer.key} className="mt-4 space-y-5">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {!layer.required ? (
                  <OptionButton config={config} manifest={manifest} layer={layer.key} optionId={null} selected={!current} onPick={() => set({ [layer.key]: null } as Partial<AvatarConfig>)} label={t("none")} />
                ) : null}
                {layer.options.map((o) => (
                  <OptionButton key={o.id} config={config} manifest={manifest} layer={layer.key} optionId={o.id} selected={current === o.id}
                    onPick={() => set({ [layer.key]: o.id } as Partial<AvatarConfig>)} label={pretty(o.id)} />
                ))}
              </div>
              {ck && palette.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{layer.tint === "skin" ? t("skin") : t("color")}</p>
                  <div className="flex flex-wrap gap-2">
                    {palette.map((c) => {
                      const on = (config as Record<string, unknown>)[ck] === c;
                      return (
                        <button key={c} type="button" aria-label={c} aria-pressed={on} onClick={() => set({ [ck]: c } as Partial<AvatarConfig>)}
                          className={cn("size-9 rounded-full border-2 transition-transform", on ? "border-foreground scale-110" : "border-transparent")}
                          style={{ backgroundColor: c }} />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
