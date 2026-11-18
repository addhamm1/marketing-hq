"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AvatarConfig, LayerKey, ManifestLayer, SpriteManifest } from "@/game/avatar/types";
import { cn } from "@/lib/utils";
import { SpriteThumb } from "./sprite-thumb";

export function OptionTile({ config, manifest, view, label, selected, onPick }: {
  config: AvatarConfig;
  manifest: SpriteManifest;
  view: LayerKey;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-24 min-w-0 flex-col items-center gap-1 rounded-lg border p-1.5 text-xs transition-[transform,background-color] active:scale-95 motion-reduce:transition-none",
        selected ? "border-primary-ink bg-accent ring-primary-ink ring-1" : "hover:bg-muted",
      )}
    >
      {selected ? <Check className="text-primary-ink absolute end-1 top-1 size-4" aria-hidden /> : null}
      <SpriteThumb config={config} manifest={manifest} view={view} />
      <span className="line-clamp-2 w-full text-center leading-tight">{label}</span>
    </button>
  );
}

/** Every regular option of a layer. Seasonal items live in the Seasonal tab. */
export function OptionGrid({ layer, manifest, worn, onPick }: {
  layer: ManifestLayer;
  manifest: SpriteManifest;
  worn: AvatarConfig;
  onPick: (id: string | null) => void;
}) {
  const t = useTranslations("character");
  const current = worn[layer.key] ?? null;
  const options = layer.options.filter((o) => !o.seasonal);
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
      {!layer.required ? (
        <OptionTile config={{ ...worn, [layer.key]: null }} manifest={manifest} view={layer.key} label={t("none")} selected={!current} onPick={() => onPick(null)} />
      ) : null}
      {options.map((o) => (
        <OptionTile
          key={o.id}
          config={{ ...worn, [layer.key]: o.id }}
          manifest={manifest}
          view={layer.key}
          label={t(`options.${o.id}` as never)}
          selected={current === o.id}
          onPick={() => onPick(o.id)}
        />
      ))}
    </div>
  );
}
