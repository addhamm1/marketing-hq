"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMediaUrls } from "../media-urls";
import type { Post } from "../types";

/** Format-aware preview: square/4:5 feed, swipeable carousel, 9:16 reel and story with caption overlay. */
export function PostPreview({ post }: { post: Post }) {
  const t = useTranslations("content");
  const [lang, setLang] = useState<"ar" | "en">(post.caption_ar && !post.caption_en ? "ar" : "en");
  const [index, setIndex] = useState(0);
  const { data: urls } = useMediaUrls(post.media);
  const caption = lang === "ar" ? post.caption_ar : post.caption_en;
  const vertical = post.format === "reel" || post.format === "story";
  const items = post.media;
  const current = items[Math.min(index, Math.max(items.length - 1, 0))];
  const src = current ? urls?.[current.id]?.url : undefined;

  return (
    <div className="space-y-3">
      <Tabs value={lang} onValueChange={(v) => setLang(v as "ar" | "en")}>
        <TabsList>
          <TabsTrigger value="ar">{t("publish.arabic")}</TabsTrigger>
          <TabsTrigger value="en">{t("publish.english")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className={cn("relative mx-auto overflow-hidden rounded-xl bg-zinc-900", vertical ? "aspect-[9/16] max-w-72" : post.format === "text" ? "max-w-md bg-white" : "aspect-[4/5] max-w-md")}>
        {post.format === "text" ? null : current && src ? (
          current.media_type === "video" ? (
            <video key={src} src={src} controls playsInline className="size-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-full object-cover" />
          )
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-white/50">{t("fields.media")}</div>
        )}
        {post.format === "carousel" && items.length > 1 ? (
          <>
            <button type="button" aria-label={t("prev")} className="absolute inset-y-0 start-0 w-1/3" onClick={() => setIndex((i) => Math.max(0, i - 1))} />
            <button type="button" aria-label={t("next")} className="absolute inset-y-0 end-0 w-1/3" onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))} />
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {items.map((m, i) => <span key={m.id} className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/40")} />)}
            </div>
          </>
        ) : null}
        {vertical && caption ? (
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 text-sm whitespace-pre-wrap text-white" dir={lang === "ar" ? "rtl" : "ltr"}>
            {caption}
          </p>
        ) : null}
      </div>
      {!vertical ? (
        <div className="mx-auto max-w-md space-y-1 text-sm">
          <p className="whitespace-pre-wrap" dir={lang === "ar" ? "rtl" : "ltr"}>{caption}</p>
          {post.hashtags.length ? <p className="text-sky-700" dir="ltr">{post.hashtags.map((h) => `#${h}`).join(" ")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
