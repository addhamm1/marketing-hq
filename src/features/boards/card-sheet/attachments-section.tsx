"use client";

import { ExternalLink, FileIcon, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMessage } from "@/hooks/use-message";
import { createClient } from "@/lib/supabase/browser";
import { addLinkAttachment, attachmentUrl, createAttachmentUpload, deleteAttachment, registerAttachment } from "../card-extras-actions";
import type { CardDetail } from "./detail-query";

function Thumb({ id, mime }: { id: string; mime: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!mime?.startsWith("image/")) return;
    let alive = true;
    attachmentUrl({ id }).then((r) => alive && r.ok && setUrl(r.data.url));
    return () => {
      alive = false;
    };
  }, [id, mime]);
  if (!url) return <FileIcon className="text-muted-foreground size-5" aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="size-10 rounded object-cover" />;
}

export function AttachmentsSection({ card, me, canEdit, onChanged }: { card: CardDetail; me: string; canEdit: boolean; onChanged: () => void }) {
  const t = useTranslations("card");
  const tc = useTranslations("common");
  const message = useMessage();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState({ url: "", name: "" });
  const [, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const signed = await createAttachmentUpload({ card_id: card.id, file_name: file.name });
        if (!signed.ok) throw new Error(signed.error);
        const { error } = await createClient().storage.from("card-attachments").uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: file.type });
        if (error) throw error;
        const reg = await registerAttachment({ card_id: card.id, path: signed.data.path, name: file.name.slice(0, 255), mime: file.type || null, size: file.size });
        if (!reg.ok) throw new Error(reg.error);
      }
      onChanged();
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  function open(id: string) {
    startTransition(async () => {
      const r = await attachmentUrl({ id });
      if (r.ok) window.open(r.data.url, "_blank", "noopener,noreferrer");
      else toast.error(message(r.error));
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-sm font-semibold">{t("attachments")}</h3>
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          {uploading ? t("uploading") : t("upload")}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><Link2 aria-hidden /> {t("addLink")}</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-2">
            <Input placeholder="https://" dir="ltr" aria-label={t("linkUrl")} value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} />
            <Input placeholder={t("linkName")} aria-label={t("linkName")} value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} />
            <Button size="sm" className="w-full" disabled={!link.url || !link.name}
              onClick={() => startTransition(async () => {
                const r = await addLinkAttachment({ card_id: card.id, ...link });
                if (r.ok) {
                  setLink({ url: "", name: "" });
                  onChanged();
                } else toast.error(message(r.error, r.params));
              })}>
              {tc("add")}
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      {card.attachments.length === 0 ? <p className="text-muted-foreground text-xs">{t("noAttachments")}</p> : null}
      <ul className="space-y-1.5">
        {card.attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-lg border p-2 text-sm">
            {a.kind === "link" ? <Link2 className="text-muted-foreground size-5" aria-hidden /> : <Thumb id={a.id} mime={a.mime} />}
            <button type="button" onClick={() => open(a.id)} className="min-w-0 flex-1 truncate text-start hover:underline">
              {a.name}
            </button>
            <ExternalLink className="text-muted-foreground size-3.5" aria-hidden />
            {canEdit || a.uploaded_by === me ? (
              <Button variant="ghost" size="icon-xs" aria-label={tc("delete")}
                onClick={() => startTransition(async () => {
                  const r = await deleteAttachment({ id: a.id });
                  if (!r.ok) toast.error(message(r.error));
                  onChanged();
                })}>
                <Trash2 aria-hidden />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
