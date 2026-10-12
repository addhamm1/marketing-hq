"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useController, type Control } from "react-hook-form";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone/file-dropzone";
import { UploadList } from "@/components/file-dropzone/upload-list";
import { useUploadQueue } from "@/components/file-dropzone/use-upload-queue";
import { discardDraft, createDraftUpload } from "@/features/boards/attachment-actions";
import { useMessage } from "@/hooks/use-message";
import { BRIEF_MEDIA_RULE } from "@/lib/uploads/rules";
import { putFile } from "@/lib/uploads/transport";
import type { DraftFile } from "./schemas";

/**
 * Reference media for a request that has no card yet: files upload straight
 * away into the requester's private drafts and are attached to the new card
 * when the form is submitted.
 */
export function DraftMediaField({ control, name, onBusy }: { control: Control<never>; name: string; onBusy?: (busy: boolean) => void }) {
  const t = useTranslations("media");
  const message = useMessage();
  const { field } = useController({ control, name: name as never });
  const value = useRef<DraftFile[]>((field.value as DraftFile[] | undefined) ?? []);
  useEffect(() => {
    value.current = (field.value as DraftFile[] | undefined) ?? [];
  }, [field.value]);

  const queue = useUploadQueue<DraftFile>({
    rule: BRIEF_MEDIA_RULE,
    upload: async (file, { onProgress, signal }) => {
      const signed = await createDraftUpload({ file_name: file.name, mime: file.type, size: file.size });
      if (!signed.ok) {
        toast.error(message(signed.error, signed.params));
        throw new Error(signed.error);
      }
      await putFile({ bucket: "card-attachments", ...signed.data }, file, onProgress, signal);
      return { path: signed.data.path, name: file.name.slice(0, 255), mime: file.type || null, size: file.size };
    },
    onUploaded: (_item, result) => {
      value.current = [...value.current, result];
      field.onChange(value.current as never);
    },
    onRemoved: (item) => {
      if (!item.result) return;
      const path = item.result.path;
      value.current = value.current.filter((f) => f.path !== path);
      field.onChange(value.current as never);
      void discardDraft({ path });
    },
  });

  const { busy } = queue;
  const report = useRef(onBusy);
  useEffect(() => {
    report.current = onBusy;
    onBusy?.(busy);
  }, [busy, onBusy]);
  useEffect(() => () => report.current?.(false), []);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("referenceMedia")}</p>
      <FileDropzone rule={BRIEF_MEDIA_RULE} onFiles={queue.add} compact={queue.items.length > 0} />
      <UploadList queue={queue} />
    </div>
  );
}
