"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { keyBetween } from "@/lib/positions";
import { createClient } from "@/lib/supabase/browser";
import { addPostMedia, movePostMedia, postMediaUploadUrl, removePostMedia } from "../actions";
import { aspectIssue, probe, uploadResumable } from "../media-process";
import { useMediaUrls } from "../media-urls";
import type { Post } from "../types";

const SIX_MB = 6 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

function safeName(file: File) {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  return `${crypto.randomUUID()}.${ext || "bin"}`;
}

async function uploadSmall(postId: string, name: string, blob: Blob, type: string) {
  const signed = await postMediaUploadUrl({ post_id: postId, name });
  if (!signed.ok) throw new Error(signed.error);
  const { error } = await createClient().storage.from("post-media").uploadToSignedUrl(signed.data.path, signed.data.token, blob, { contentType: type });
  if (error) throw error;
  return signed.data.path;
}

export function MediaManager({ post, canEdit, onChanged }: { post: Post; canEdit: boolean; onChanged: () => void }) {
  const t = useTranslations("content.editor");
  const tf = useTranslations("content");
  const message = useMessage();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ name: string; percent: number } | null>(null);
  const [, startTransition] = useTransition();
  const { data: urls } = useMediaUrls(post.media);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    let last = post.media.at(-1)?.position ?? null;
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        setProgress({ name: file.name, percent: 0 });
        const info = await probe(file);
        const name = safeName(file);
        const path = `posts/${post.id}/${name}`;
        if (file.size > SIX_MB) await uploadResumable(file, path, (percent) => setProgress({ name: file.name, percent }));
        else await uploadSmall(post.id, name, file, file.type);
        const thumbPath = info.thumb ? await uploadSmall(post.id, `thumb-${name.replace(/\.\w+$/, "")}.jpg`, info.thumb, "image/jpeg") : null;
        last = keyBetween(last, null);
        const r = await addPostMedia({
          post_id: post.id, storage_path: path, thumbnail_path: thumbPath, media_type: file.type.startsWith("video/") ? "video" : "image",
          width: info.width, height: info.height, duration_seconds: info.duration ? Math.round(info.duration * 10) / 10 : null, position: last,
        });
        if (!r.ok) throw new Error(r.error);
      }
    } catch {
      toast.error(message("card.uploadFailed"));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
      onChanged();
    }
  }

  function move(i: number, dir: -1 | 1) {
    const items = post.media;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const rest = items.filter((_, k) => k !== i);
    const at = j;
    const position = keyBetween(rest[at - 1]?.position, rest[at]?.position);
    startTransition(async () => {
      const r = await movePostMedia({ id: items[i].id, position });
      if (!r.ok) toast.error(message(r.error));
      onChanged();
    });
  }

  const carouselBad = post.format === "carousel" && (post.media.length < 2 || post.media.length > 10);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{tf("fields.media")}</p>
        {canEdit ? (
          <>
            <input ref={input} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            <Button variant="outline" size="sm" disabled={!!progress} onClick={() => input.current?.click()}>
              {progress ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />} {t("upload")}
            </Button>
          </>
        ) : null}
      </div>
      {progress ? <p className="text-muted-foreground text-xs">{t("uploading", { name: progress.name, percent: progress.percent })}</p> : null}
      {carouselBad ? <p className="text-xs text-amber-700">{t("carouselCount")}</p> : null}
      <ul className="space-y-1.5">
        {post.media.map((m, i) => {
          const issue = aspectIssue(post.format, m.width, m.height);
          const thumb = urls?.[m.id]?.thumb ?? (m.media_type === "image" ? urls?.[m.id]?.url : undefined);
          return (
            <li key={m.id} className="flex items-center gap-2 rounded-lg border p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumb ? <img src={thumb} alt="" className="size-12 rounded object-cover" /> : <span className="bg-muted size-12 rounded" />}
              <div className="min-w-0 flex-1 text-xs">
                <p className="text-muted-foreground" dir="ltr">
                  {m.width && m.height ? `${m.width}×${m.height}` : ""} {m.duration_seconds ? `· ${m.duration_seconds}s` : ""}
                </p>
                {issue ? (
                  <p className="flex items-center gap-1 text-amber-700"><AlertTriangle className="size-3" aria-hidden /> {t("aspectWarning", { orientation: t(issue), format: tf(`format.${post.format as "feed"}`) })}</p>
                ) : null}
              </div>
              {canEdit ? (
                <div className="flex">
                  <Button variant="ghost" size="icon-xs" aria-label={t("moveUp")} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp aria-hidden /></Button>
                  <Button variant="ghost" size="icon-xs" aria-label={t("moveDown")} disabled={i === post.media.length - 1} onClick={() => move(i, 1)}><ArrowDown aria-hidden /></Button>
                  <Button variant="ghost" size="icon-xs" aria-label={t("removeMedia")}
                    onClick={() => startTransition(async () => { const r = await removePostMedia({ id: m.id }); if (!r.ok) toast.error(message(r.error)); onChanged(); })}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
