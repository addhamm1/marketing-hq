"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { layerColorKey } from "@/game/avatar/config";
import type { AvatarConfig, ManifestLayer, SpriteManifest } from "@/game/avatar/types";
import { cn } from "@/lib/utils";

function SwatchRow({ title, colors, value, offset, onPick }: {
  title: string;
  colors: string[];
  value: string | undefined;
  offset: number;
  onPick: (color: string) => void;
}) {
  const t = useTranslations("character");
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => {
          const on = value?.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={t("swatch", { n: offset + i + 1 })}
              aria-pressed={on}
              onClick={() => onPick(c)}
              style={{ backgroundColor: c }}
              className={cn(
                "border-border flex size-10 items-center justify-center rounded-full border transition-transform active:scale-90 motion-reduce:transition-none",
                on && "ring-foreground ring-offset-background ring-2 ring-offset-2",
              )}
            >
              {on ? <Check className="size-4 text-white mix-blend-difference" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Colour choices for the selected item. Items with their own fixed colours show none. */
export function Swatches({ layer, manifest, worn, onPick }: {
  layer: ManifestLayer;
  manifest: SpriteManifest;
  worn: AvatarConfig;
  onPick: (key: string, color: string) => void;
}) {
  const t = useTranslations("character");
  const key = layerColorKey(layer.key);
  const selected = layer.options.find((o) => o.id === worn[layer.key]);
  if (!key || !layer.tint || !selected?.tintable) return null;
  const palette = manifest.palettes[layer.tint];
  const value = worn[key];
  const brand = layer.tint === "clothing" ? (manifest.brandColors ?? []) : [];
  const others = palette.filter((c) => !brand.includes(c));
  const title = layer.tint === "skin" ? t("skin") : t("color");
  return (
    <div className="space-y-4">
      {brand.length ? <SwatchRow title={t("brandColors")} colors={brand} value={value} offset={0} onPick={(c) => onPick(key, c)} /> : null}
      <SwatchRow title={title} colors={others} value={value} offset={brand.length} onPick={(c) => onPick(key, c)} />
    </div>
  );
}
