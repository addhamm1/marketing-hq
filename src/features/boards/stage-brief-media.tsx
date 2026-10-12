"use client";

import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone/file-dropzone";
import { LinkField } from "@/components/file-dropzone/link-field";
import { UploadList } from "@/components/file-dropzone/upload-list";
import type { UploadQueue } from "@/components/file-dropzone/use-upload-queue";
import { Label } from "@/components/ui/label";
import { useMessage } from "@/hooks/use-message";
import { BRIEF_MEDIA_RULE } from "@/lib/uploads/rules";
import { addLinkAttachment } from "./attachment-actions";

/** Reference media inside the "Start production" brief: files upload to the card while you fill the rest. */
export function StageBriefMedia({ cardId, queue }: { cardId: string; queue: UploadQueue<{ id: string }> }) {
  const t = useTranslations("media");
  const message = useMessage();
  const [links, setLinks] = useState<{ url: string; name: string }[]>([]);

  async function addLink(link: { url: string; name: string }) {
    const r = await addLinkAttachment({ card_id: cardId, ...link });
    if (!r.ok) toast.error(message(r.error, r.params));
    else setLinks((l) => [...l, link]);
    return r.ok;
  }

  return (
    <div className="space-y-2">
      <Label>{t("referenceMedia")}</Label>
      <FileDropzone rule={BRIEF_MEDIA_RULE} onFiles={queue.add} compact />
      <UploadList queue={queue} className="sm:grid-cols-1" />
      <LinkField onAdd={addLink} />
      {links.length ? (
        <ul className="space-y-1 text-sm">
          {links.map((l) => (
            <li key={l.url} className="flex min-w-0 items-center gap-2">
              <Link2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="truncate">{l.name}</span>
              <span className="text-muted-foreground truncate text-xs" dir="ltr">{l.url}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
