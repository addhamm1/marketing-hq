"use client";

import { CheckCircle2, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessage } from "@/hooks/use-message";
import { markPublished } from "../actions";
import { useMediaUrls } from "../media-urls";
import type { Post } from "../types";

/** Publishing by hand: copy captions and hashtags, download media, then mark as published. */
export function PublishActions({ post, canPublish, onDone }: { post: Post; canPublish: boolean; onDone: () => void }) {
  const t = useTranslations("content.publish");
  const tp = useTranslations("platform");
  const message = useMessage();
  const { data: urls } = useMediaUrls(post.media);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  async function downloadAll() {
    for (const m of post.media) {
      const url = urls?.[m.id]?.url;
      if (!url) continue;
      const a = document.createElement("a");
      a.href = `${url}&download=${encodeURIComponent(m.storage_path.split("/").pop() ?? "media")}`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {post.caption_ar ? <CopyButton value={post.caption_ar} label={t("copyCaption", { lang: t("arabic") })} /> : null}
        {post.caption_en ? <CopyButton value={post.caption_en} label={t("copyCaption", { lang: t("english") })} /> : null}
        {post.hashtags.length ? <CopyButton value={post.hashtags.map((h) => `#${h}`).join(" ")} label={t("copyHashtags")} /> : null}
        {post.media.length ? <Button variant="outline" size="sm" onClick={downloadAll}><Download aria-hidden /> {t("download")}</Button> : null}
      </div>
      {canPublish && (post.status === "approved" || post.status === "scheduled") ? (
        <div className="space-y-3 rounded-xl border p-3">
          <p className="text-sm font-medium">{t("links")}</p>
          {post.platforms.map((p) => (
            <div key={p} className="grid grid-cols-[6rem_1fr] items-center gap-2">
              <Label htmlFor={`link-${p}`} className="text-xs">{tp(p as "facebook")}</Label>
              <Input id={`link-${p}`} dir="ltr" placeholder="https://" value={links[p] ?? ""} onChange={(e) => setLinks({ ...links, [p]: e.target.value })} />
            </div>
          ))}
          <Button disabled={pending}
            onClick={() => startTransition(async () => {
              const clean = Object.fromEntries(Object.entries(links).filter(([, v]) => /^https?:\/\//.test(v)));
              const r = await markPublished({ id: post.id, links: clean });
              if (r.ok) {
                toast.success(t("published"));
                onDone();
              } else toast.error(message(r.error));
            })}>
            <CheckCircle2 aria-hidden /> {t("markPublished")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
