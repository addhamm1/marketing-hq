"use client";

import { ExternalLink, Link2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone/file-dropzone";
import { LinkField } from "@/components/file-dropzone/link-field";
import { UploadList } from "@/components/file-dropzone/upload-list";
import type { UploadQueue } from "@/components/file-dropzone/use-upload-queue";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { BRIEF_MEDIA_RULE } from "@/lib/uploads/rules";
import { addLinkAttachment, deleteAttachment } from "../attachment-actions";
import type { CardDetail } from "./detail-query";
import { MediaGallery, type FileAttachment } from "./media-gallery";
import { useCardUploads } from "./use-card-uploads";

type Props = {
  card: CardDetail;
  me: string;
  canEdit: boolean;
  onChanged: () => void;
  /** Shared queue when the whole sheet accepts drops; otherwise the section keeps its own. */
  queue?: UploadQueue<{ id: string }>;
};

/** Brief media: drop / paste / browse uploads, reference links and a gallery of what is attached. */
export function AttachmentsSection({ card, me, canEdit, onChanged, queue }: Props) {
  const t = useTranslations("media");
  const tc = useTranslations("common");
  const message = useMessage();
  const own = useCardUploads(card.id, onChanged);
  const uploads = queue ?? own;
  const [, startTransition] = useTransition();
  const files = card.attachments.filter((a) => a.kind === "file");
  const links = card.attachments.filter((a) => a.kind === "link");
  const canDelete = (a: FileAttachment) => canEdit || a.uploaded_by === me;

  function remove(a: FileAttachment) {
    startTransition(async () => {
      const r = await deleteAttachment({ id: a.id });
      if (!r.ok) toast.error(message(r.error));
      onChanged();
    });
  }

  async function addLink(link: { url: string; name: string }) {
    const r = await addLinkAttachment({ card_id: card.id, ...link });
    if (!r.ok) toast.error(message(r.error, r.params));
    else onChanged();
    return r.ok;
  }

  return (
    <section className="space-y-3" aria-labelledby={`media-${card.id}`}>
      <div className="flex items-baseline gap-2">
        <h3 id={`media-${card.id}`} className="flex-1 text-sm font-semibold">{t("title")}</h3>
        {card.attachments.length ? <span className="text-muted-foreground text-xs">{t("count", { count: card.attachments.length })}</span> : null}
      </div>
      <FileDropzone rule={BRIEF_MEDIA_RULE} onFiles={uploads.add} compact={files.length > 0} />
      <UploadList queue={uploads} hideDone />
      <MediaGallery cardId={card.id} files={files} canDelete={canDelete} onDelete={remove} />
      <LinkField onAdd={addLink} />
      {links.length ? (
        <ul className="space-y-1.5" aria-label={t("links")}>
          {links.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <Link2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <a href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                {a.name} <span className="text-muted-foreground text-xs" dir="ltr">{a.url}</span>
              </a>
              <ExternalLink className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              {canDelete(a) ? (
                <Button variant="ghost" size="icon-xs" aria-label={tc("delete")} onClick={() => remove(a)}>
                  <Trash2 aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!card.attachments.length && !uploads.items.length ? <p className="text-muted-foreground text-xs">{t("empty")}</p> : null}
    </section>
  );
}
