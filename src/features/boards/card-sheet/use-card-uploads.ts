"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUploadQueue } from "@/components/file-dropzone/use-upload-queue";
import { useMessage } from "@/hooks/use-message";
import { BRIEF_MEDIA_RULE } from "@/lib/uploads/rules";
import { putFile } from "@/lib/uploads/transport";
import { createAttachmentUpload, deleteAttachment, registerAttachment } from "../attachment-actions";

/** Upload queue straight into a card's brief media; each finished file is registered right away. */
export function useCardUploads(cardId: string | undefined, onChanged?: () => void) {
  const message = useMessage();
  const queryClient = useQueryClient();
  return useUploadQueue<{ id: string }>({
    rule: BRIEF_MEDIA_RULE,
    upload: async (file, { onProgress, signal }) => {
      if (!cardId) throw new Error("no card");
      const meta = { card_id: cardId, file_name: file.name, mime: file.type, size: file.size };
      const signed = await createAttachmentUpload(meta);
      if (!signed.ok) {
        toast.error(message(signed.error, signed.params));
        throw new Error(signed.error);
      }
      await putFile({ bucket: "card-attachments", ...signed.data }, file, onProgress, signal);
      const reg = await registerAttachment({ card_id: cardId, path: signed.data.path, name: file.name.slice(0, 255), mime: file.type || null, size: file.size });
      if (!reg.ok) throw new Error(reg.error);
      return reg.data;
    },
    onUploaded: () => {
      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      onChanged?.();
    },
    // Removing a finished row (e.g. in the Start production dialog) deletes the attachment too.
    onRemoved: async (item) => {
      if (!item.result) return;
      const r = await deleteAttachment({ id: item.result.id });
      if (!r.ok) toast.error(message(r.error));
      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      onChanged?.();
    },
  });
}
