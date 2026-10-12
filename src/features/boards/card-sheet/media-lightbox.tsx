"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, FileIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useMessage } from "@/hooks/use-message";
import { formatBytes, mediaKind } from "@/lib/uploads/rules";
import { attachmentUrl } from "../attachment-actions";
import type { FileAttachment } from "./media-gallery";

type Props = {
  files: FileAttachment[];
  urls: Record<string, string>;
  index: number | null;
  onIndex: (i: number | null) => void;
  canDelete: (f: FileAttachment) => boolean;
  onDelete: (f: FileAttachment) => void;
};

export function MediaLightbox({ files, urls, index, onIndex, canDelete, onDelete }: Props) {
  const t = useTranslations("media");
  const tc = useTranslations("common");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const file = index === null ? null : files[index];
  const url = file ? urls[file.id] : undefined;
  const kind = file ? mediaKind(file.mime, file.name) : "other";
  const step = (d: number) => index !== null && onIndex((index + d + files.length) % files.length);

  function download() {
    if (!file) return;
    startTransition(async () => {
      const r = await attachmentUrl({ id: file.id, download: true });
      if (!r.ok) return void toast.error(message(r.error));
      const a = document.createElement("a");
      a.href = r.data.url;
      a.rel = "noopener";
      a.click();
    });
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onIndex(null)}>
      <DialogContent
        className="max-h-[95dvh] gap-3 overflow-y-auto p-3 sm:max-w-3xl sm:p-4"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            const forward = (e.key === "ArrowRight") !== (document.dir === "rtl");
            step(forward ? 1 : -1);
          }
        }}
      >
        <DialogTitle className="truncate pe-8 text-sm">{file?.name}</DialogTitle>
        <DialogDescription className="sr-only">{t("lightboxHint")}</DialogDescription>
        <div className="bg-muted/60 relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg">
          {file && url && kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={file.name} className="max-h-[65dvh] w-auto object-contain" />
          ) : file && url && kind === "video" ? (
            <video key={file.id} src={url} controls autoPlay playsInline className="max-h-[65dvh] w-full" />
          ) : file && url && kind === "pdf" ? (
            <iframe src={url} title={file.name} className="h-[65dvh] w-full bg-white" />
          ) : (
            <FileIcon className="text-muted-foreground size-10" aria-hidden />
          )}
          {files.length > 1 ? (
            <>
              <Button variant="secondary" size="icon" className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full opacity-90" aria-label={t("previous")} onClick={() => step(-1)}>
                <ChevronLeft className="rtl:rotate-180" aria-hidden />
              </Button>
              <Button variant="secondary" size="icon" className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full opacity-90" aria-label={t("next")} onClick={() => step(1)}>
                <ChevronRight className="rtl:rotate-180" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground flex-1 text-xs" dir="ltr">
            {file?.size ? formatBytes(file.size) : ""} {index !== null && files.length > 1 ? `· ${index + 1}/${files.length}` : ""}
          </p>
          {file && canDelete(file) ? (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => onDelete(file)}>
              <Trash2 aria-hidden /> {tc("delete")}
            </Button>
          ) : null}
          {url ? (
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden /> {t("open")}</a>
            </Button>
          ) : null}
          <Button size="sm" disabled={pending} onClick={download}>
            <Download aria-hidden /> {t("download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
