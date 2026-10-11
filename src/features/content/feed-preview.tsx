"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/states/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Brand } from "@/features/boards/types";
import { formatCairo } from "@/lib/dates";
import { Thumb } from "./post-tile";
import type { Post } from "./types";

/** Phone-shaped frame: a 3-column grid or a scrolling feed for one brand (neutral design). */
export function FeedPreview({ posts, brands, onOpen }: { posts: Post[]; brands: Brand[]; onOpen: (id: string) => void }) {
  const t = useTranslations("content.feedPreview");
  const locale = useLocale();
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [mode, setMode] = useState<"grid" | "scroll">("grid");
  const brand = brands.find((b) => b.id === brandId);
  const upcoming = posts
    .filter((p) => p.brand_id === brandId && p.scheduled_at && p.format !== "story")
    .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger size="sm" className="w-44" aria-label={t("pickBrand")}><SelectValue /></SelectTrigger>
          <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="grid">{t("grid")}</TabsTrigger>
            <TabsTrigger value="scroll">{t("scroll")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="mx-auto w-full max-w-[390px] rounded-[2.5rem] border-8 border-zinc-900 bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-8 rounded-full" style={{ backgroundColor: brand?.color }} />
          <span className="font-semibold">{brand?.name}</span>
        </div>
        <div className="h-[640px] overflow-y-auto">
          {upcoming.length === 0 ? (
            <div className="p-6"><EmptyState title={t("empty")} /></div>
          ) : mode === "grid" ? (
            <div className="grid grid-cols-3 gap-0.5">
              {upcoming.map((p) => (
                <button key={p.id} type="button" onClick={() => onOpen(p.id)} className="relative aspect-square">
                  <Thumb post={p} className="size-full" />
                </button>
              ))}
            </div>
          ) : (
            <ul className="divide-y">
              {upcoming.map((p) => {
                const caption = (locale === "ar" ? p.caption_ar : p.caption_en) || p.caption_en || p.caption_ar;
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => onOpen(p.id)} className="w-full text-start">
                      <Thumb post={p} className="aspect-square w-full" />
                      <div className="space-y-1 p-3 text-sm">
                        <p className="text-muted-foreground text-xs" dir="ltr">{formatCairo(p.scheduled_at!, "d MMM, HH:mm")}</p>
                        <p className="line-clamp-4 whitespace-pre-wrap" dir={caption === p.caption_ar && p.caption_ar ? "rtl" : "ltr"}>{caption}</p>
                        {p.hashtags.length ? <p className="text-sky-700" dir="ltr">{p.hashtags.map((h) => `#${h}`).join(" ")}</p> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
