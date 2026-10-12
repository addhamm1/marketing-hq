"use client";

import { Check, FileIcon, FileText, Film, RotateCcw, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes, mediaKind } from "@/lib/uploads/rules";
import { cn } from "@/lib/utils";
import type { UploadItem, UploadQueue } from "./use-upload-queue";

function Thumb<R>({ item }: { item: UploadItem<R> }) {
  if (item.preview) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.preview} alt="" className="size-12 shrink-0 rounded-md object-cover" />;
  }
  const kind = mediaKind(item.file.type, item.file.name);
  const Icon = kind === "video" ? Film : kind === "pdf" ? FileText : FileIcon;
  return (
    <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md">
      <Icon className="text-muted-foreground size-5" aria-hidden />
    </span>
  );
}

/** One row per file: preview, name, size, progress and cancel / retry / remove. */
export function UploadList<R>({ queue, hideDone, className }: { queue: UploadQueue<R>; hideDone?: boolean; className?: string }) {
  const t = useTranslations("media");
  const items = hideDone ? queue.items.filter((i) => i.status !== "done") : queue.items;
  if (!items.length) return null;
  return (
    <ul className={cn("grid gap-2 sm:grid-cols-2", className)} aria-label={t("uploads")}>
      {items.map((item) => (
        <li key={item.id} data-testid="upload-item" data-status={item.status} className="bg-card flex items-center gap-3 rounded-lg border p-2">
          <Thumb item={item} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm" title={item.file.name}>{item.file.name}</p>
            {item.status === "uploading" || item.status === "queued" ? (
              <Progress value={item.progress} aria-label={t("progress", { name: item.file.name })} />
            ) : null}
            <p className={cn("text-xs", item.status === "error" ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
              <span dir="ltr">{formatBytes(item.file.size)}</span>
              {" · "}
              {item.status === "uploading" ? t("percent", { percent: item.progress }) : t(`status.${item.status}`)}
              {item.status === "done" ? <Check className="ms-1 inline size-3 text-emerald-600" aria-hidden /> : null}
            </p>
          </div>
          {item.status === "uploading" || item.status === "queued" ? (
            <Button type="button" variant="ghost" size="icon-xs" aria-label={t("cancel", { name: item.file.name })} onClick={() => queue.cancel(item.id)}>
              <X aria-hidden />
            </Button>
          ) : (
            <>
              {item.status === "error" || item.status === "canceled" ? (
                <Button type="button" variant="ghost" size="icon-xs" aria-label={t("retry", { name: item.file.name })} onClick={() => queue.retry(item.id)}>
                  <RotateCcw aria-hidden />
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="icon-xs" aria-label={t("remove", { name: item.file.name })} onClick={() => queue.remove(item.id)}>
                <Trash2 aria-hidden />
              </Button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
