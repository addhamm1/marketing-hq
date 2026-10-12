"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { previewUrl } from "@/lib/uploads/probe";
import { screenFiles, type FileRule } from "@/lib/uploads/rules";
import { UploadAborted } from "@/lib/uploads/transport";

export type UploadStatus = "queued" | "uploading" | "done" | "error" | "canceled";

export type UploadItem<R> = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  preview: string | null;
  result?: R;
};

export type Uploader<R> = (file: File, ctx: { onProgress: (percent: number) => void; signal: AbortSignal }) => Promise<R>;

type Options<R> = {
  rule: FileRule;
  upload: Uploader<R>;
  onUploaded?: (item: UploadItem<R>, result: R) => void;
  onRemoved?: (item: UploadItem<R>) => void;
  concurrency?: number;
};

/**
 * Background upload queue: files start as soon as they are added, a few at a time,
 * each with its own progress, cancel and retry. Uploads keep going if the
 * component that started them unmounts.
 */
export function useUploadQueue<R>({ rule, upload, onUploaded, onRemoved, concurrency = 3 }: Options<R>) {
  const t = useTranslations("media.errors");
  const [items, setItems] = useState<UploadItem<R>[]>([]);
  const ref = useRef<UploadItem<R>[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const latest = useRef({ upload, onUploaded, onRemoved });
  useEffect(() => {
    latest.current = { upload, onUploaded, onRemoved };
  });

  const commit = useCallback((next: UploadItem<R>[]) => {
    ref.current = next;
    setItems(next);
  }, []);
  const patch = useCallback(
    (id: string, p: Partial<UploadItem<R>>) => commit(ref.current.map((i) => (i.id === id ? { ...i, ...p } : i))),
    [commit],
  );

  // The finished upload starts the next one; via a ref because pump refers to itself.
  const again = useRef<() => void>(() => undefined);
  const pump = useCallback(() => {
    const running = ref.current.filter((i) => i.status === "uploading").length;
    const next = ref.current.filter((i) => i.status === "queued").slice(0, Math.max(0, concurrency - running));
    for (const item of next) {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patch(item.id, { status: "uploading", progress: 0 });
      latest.current
        .upload(item.file, { signal: controller.signal, onProgress: (progress) => patch(item.id, { progress: Math.min(progress, 99) }) })
        .then((result) => {
          if (controller.signal.aborted) return;
          patch(item.id, { status: "done", progress: 100, result });
          const done = ref.current.find((i) => i.id === item.id);
          if (done) latest.current.onUploaded?.(done, result);
        })
        .catch((e: unknown) => {
          const canceled = e instanceof UploadAborted || controller.signal.aborted;
          if (ref.current.some((i) => i.id === item.id)) patch(item.id, { status: canceled ? "canceled" : "error" });
        })
        .finally(() => {
          controllers.current.delete(item.id);
          again.current();
        });
    }
  }, [concurrency, patch]);
  useEffect(() => {
    again.current = pump;
  }, [pump]);

  const add = useCallback(
    (files: File[]): number => {
      if (!files.length) return 0;
      const active = ref.current.filter((i) => i.status !== "canceled" && i.status !== "error").length;
      const { accepted, errors } = screenFiles(files, rule, active);
      for (const e of errors) toast.error(t(e.key, e.params));
      if (!accepted.length) return 0;
      const fresh = accepted.map<UploadItem<R>>((file) => ({ id: crypto.randomUUID(), file, status: "queued", progress: 0, preview: null }));
      commit([...ref.current, ...fresh]);
      for (const item of fresh) previewUrl(item.file).then((preview) => preview && patch(item.id, { preview }));
      pump();
      return fresh.length;
    },
    [rule, t, commit, patch, pump],
  );

  const cancel = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    patch(id, { status: "canceled" });
  }, [patch]);

  const retry = useCallback((id: string) => {
    patch(id, { status: "queued", progress: 0 });
    pump();
  }, [patch, pump]);

  const remove = useCallback((id: string) => {
    const item = ref.current.find((i) => i.id === id);
    if (!item) return;
    controllers.current.get(id)?.abort();
    if (item.preview) URL.revokeObjectURL(item.preview);
    commit(ref.current.filter((i) => i.id !== id));
    latest.current.onRemoved?.(item);
  }, [commit]);

  /** Drops finished and canceled rows (e.g. once the gallery shows them). */
  const clearFinished = useCallback(() => {
    for (const i of ref.current) if (i.status === "done" && i.preview) URL.revokeObjectURL(i.preview);
    commit(ref.current.filter((i) => i.status !== "done" && i.status !== "canceled"));
  }, [commit]);

  useEffect(() => () => {
    for (const i of ref.current) if (i.preview) URL.revokeObjectURL(i.preview);
  }, []);

  const busy = items.some((i) => i.status === "queued" || i.status === "uploading");
  return { items, add, cancel, retry, remove, clearFinished, busy };
}

export type UploadQueue<R> = ReturnType<typeof useUploadQueue<R>>;
