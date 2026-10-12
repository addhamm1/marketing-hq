"use client";

import { useQuery } from "@tanstack/react-query";
import { FileIcon, FileText, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaKind } from "@/lib/uploads/rules";
import { attachmentUrls } from "../attachment-actions";
import type { CardDetail } from "./detail-query";
import { MediaLightbox } from "./media-lightbox";

export type FileAttachment = CardDetail["attachments"][number];

function Tile({ file, url }: { file: FileAttachment; url?: string }) {
  const kind = mediaKind(file.mime, file.name);
  if (kind === "image" && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading="lazy" className="size-full object-cover" />;
  }
  if (kind === "video" && url) {
    return (
      <>
        <video src={`${url}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-black/55 text-white"><Play className="size-4 fill-current" aria-hidden /></span>
        </span>
      </>
    );
  }
  const Icon = kind === "pdf" ? FileText : FileIcon;
  return (
    <span className="flex size-full flex-col items-center justify-center gap-1 p-2">
      <Icon className="text-muted-foreground size-6" aria-hidden />
      <span className="text-muted-foreground line-clamp-2 text-[11px] break-all">{file.name}</span>
    </span>
  );
}

/** Grid of brief media thumbnails; click for a lightbox with preview, download and delete. */
export function MediaGallery({ cardId, files, canDelete, onDelete }: { cardId: string; files: FileAttachment[]; canDelete: (f: FileAttachment) => boolean; onDelete: (f: FileAttachment) => void }) {
  const t = useTranslations("media");
  const [open, setOpen] = useState<number | null>(null);
  const ids = files.map((f) => f.id).join(",");
  const { data: urls, isLoading, isError, refetch } = useQuery({
    queryKey: ["attachment-urls", cardId, ids],
    queryFn: async () => {
      const r = await attachmentUrls({ card_id: cardId });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    enabled: files.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (!files.length) return null;
  if (isError) {
    return (
      <p role="alert" className="text-destructive flex items-center gap-2 text-sm">
        {t("loadError")} <Button variant="link" size="sm" className="h-auto p-0" onClick={() => refetch()}>{t("tryAgain")}</Button>
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label={t("gallery")} data-testid="media-gallery">
        {files.map((f, i) => (
          <li key={f.id}>
            {isLoading ? (
              <Skeleton className="aspect-square w-full rounded-lg" />
            ) : (
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={t("preview", { name: f.name })}
                data-testid="media-tile"
                className="bg-muted focus-visible:ring-ring/50 relative block aspect-square w-full overflow-hidden rounded-lg border outline-none hover:opacity-90 focus-visible:ring-[3px]"
              >
                <Tile file={f} url={urls?.[f.id]} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <MediaLightbox
        files={files}
        urls={urls ?? {}}
        index={open}
        onIndex={setOpen}
        canDelete={canDelete}
        onDelete={(f) => {
          setOpen(null);
          onDelete(f);
        }}
      />
    </>
  );
}
